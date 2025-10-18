import { MCPTool } from "mcp-framework";
import { z } from "zod";
import { Codex } from "@openai/codex-sdk";
import { execSync } from "child_process";
import {
  readFileSync,
  existsSync,
  accessSync,
  constants,
  statSync,
  realpathSync,
} from "fs";
import { resolve, normalize, relative } from "path";

interface CodexReviewInput {
  repositoryPath?: string;
  reviewType?: "full" | "staged" | "modified";
  includeSuggestions?: boolean;
  useCodex?: boolean;
}

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
}

interface CodeReviewResult {
  summary: string;
  files: Array<{
    path: string;
    status: string;
    reason?: string;
    codexAnalysis?: {
      context: string;
      securityIssues: string[];
      performanceIssues: string[];
      architectureIssues: string[];
      logicIssues: string[];
      suggestions: string[];
    };
  }>;
}

class CodexReviewTool extends MCPTool<CodexReviewInput> {
  name = "codex_review";
  description =
    "Performs intelligent code review using OpenAI Codex SDK for TypeScript files";

  // Codex SDK instance
  private codex: Codex;
  private codexAvailable: boolean = false;

  constructor() {
    super();
    this.codex = new Codex();
  }

  // Maximum file size (50KB for better analysis quality)
  private readonly MAX_FILE_SIZE = 50 * 1024;

  // Maximum lines for analysis (500 lines)
  private readonly MAX_LINES = 2500;

  // Maximum functions/classes for analysis
  private readonly MAX_FUNCTIONS = 50;
  private readonly MAX_CLASSES = 10;

  // Security: Path validation and normalization
  private validateAndNormalizePath(
    inputPath: string,
    basePath: string
  ): string {
    if (!inputPath || typeof inputPath !== "string") {
      throw new Error("Invalid path provided");
    }

    // Normalize path
    const normalizedPath = normalize(inputPath);

    // Convert to absolute path
    const absolutePath = resolve(basePath, normalizedPath);

    // Resolve symlinks to prevent symlink traversal attacks
    let realPath: string;
    try {
      realPath = realpathSync(absolutePath);
    } catch (error) {
      throw new Error("Path resolution failed");
    }

    // Prevent path traversal attacks: check if resolved path goes outside basePath
    const relativePath = relative(basePath, realPath);
    // Check for actual path traversal by examining path segments
    const pathSegments = relativePath.split(/[/\\]/);
    if (pathSegments.includes("..")) {
      throw new Error("Path traversal not allowed");
    }

    return realPath;
  }

  // Security: File access permission check
  private validateFileAccess(filePath: string): boolean {
    try {
      // Check if file exists
      if (!existsSync(filePath)) {
        return false;
      }

      // Check read permission
      accessSync(filePath, constants.R_OK);

      // Check file size
      const stats = statSync(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new Error("File is too large");
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Check if file is suitable for analysis
  private isFileSuitableForAnalysis(
    filePath: string,
    content: string
  ): { suitable: boolean; reason?: string } {
    // Check file extension
    const extension = filePath.split(".").pop()?.toLowerCase();
    if (extension !== "ts" && extension !== "tsx") {
      return {
        suitable: false,
        reason: "Only TypeScript files (.ts, .tsx) are supported",
      };
    }

    // Check file size
    if (content.length > this.MAX_FILE_SIZE) {
      return {
        suitable: false,
        reason: `File too large (${Math.round(
          content.length / 1024
        )}KB > ${Math.round(this.MAX_FILE_SIZE / 1024)}KB)`,
      };
    }

    // Check line count
    const lines = content.split("\n");
    if (lines.length > this.MAX_LINES) {
      return {
        suitable: false,
        reason: `Too many lines (${lines.length} > ${this.MAX_LINES})`,
      };
    }

    // Check complexity (simple heuristics)
    const functionCount = (
      content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []
    ).length;
    const classCount = (content.match(/class\s+\w+/g) || []).length;

    if (functionCount > this.MAX_FUNCTIONS) {
      return {
        suitable: false,
        reason: `Too many functions (${functionCount} > ${this.MAX_FUNCTIONS})`,
      };
    }

    if (classCount > this.MAX_CLASSES) {
      return {
        suitable: false,
        reason: `Too many classes (${classCount} > ${this.MAX_CLASSES})`,
      };
    }

    // Skip test files and type definition files
    const fileName = filePath.toLowerCase();
    if (
      fileName.includes(".test.") ||
      fileName.includes(".spec.") ||
      fileName.includes(".d.ts")
    ) {
      return {
        suitable: false,
        reason: "Test files and type definitions are skipped",
      };
    }

    return { suitable: true };
  }

  // Security: Safe Git command execution
  private safeExecGitCommand(command: string, cwd: string): string {
    try {
      // Validate working directory
      const validatedCwd = this.validateAndNormalizePath(cwd, process.cwd());

      // Git command whitelist validation
      const allowedCommands = [
        "git status --porcelain",
        "git branch --show-current",
        "git rev-list --left-right --count HEAD@{upstream}...HEAD",
      ];

      if (!allowedCommands.includes(command)) {
        throw new Error("Git command not allowed");
      }

      return execSync(command, {
        cwd: validatedCwd,
        encoding: "utf8",
        timeout: 10000, // 10 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer limit
      });
    } catch (error) {
      throw new Error("Git command execution failed");
    }
  }

  schema = z.object({
    repositoryPath: z
      .string()
      .optional()
      .describe("Repository path to review (default: current directory)"),
    reviewType: z
      .enum(["full", "staged", "modified"])
      .optional()
      .describe(
        "Review type: full(all), staged(staged files), modified(modified files)"
      ),
    includeSuggestions: z
      .boolean()
      .optional()
      .describe("Whether to include improvement suggestions"),
    useCodex: z
      .boolean()
      .optional()
      .describe("Whether to use Codex AI for intelligent code review"),
  });

  async execute(input: CodexReviewInput): Promise<string> {
    const {
      repositoryPath = process.env.DEFAULT_REPO_PATH || process.cwd(),
      reviewType = (process.env.DEFAULT_REVIEW_TYPE as "full" | "staged" | "modified") || "modified",
      includeSuggestions = process.env.DEFAULT_INCLUDE_SUGGESTIONS === "true",
      useCodex = process.env.DEFAULT_USE_CODEX === "true",
    } = input;

    console.log("test", input);

    try {
      // Security: Input validation
      if (typeof repositoryPath !== "string" || repositoryPath.length === 0) {
        throw new Error("Invalid repository path");
      }

      if (!["full", "staged", "modified"].includes(reviewType)) {
        throw new Error("Invalid review type");
      }

      if (typeof includeSuggestions !== "boolean") {
        throw new Error("Invalid suggestion inclusion option");
      }

      if (typeof useCodex !== "boolean") {
        throw new Error("Invalid Codex usage option");
      }

      // Check Codex CLI availability if Codex is enabled
      if (useCodex) {
        this.codexAvailable = await this.checkCodexAvailability();
        if (!this.codexAvailable) {
          throw new Error(
            "Codex CLI is required but not available. Please install and authenticate Codex CLI."
          );
        }
      }

      console.log("Analyzing Git status...");
      // Analyze Git status
      const gitStatus = await this.analyzeGitStatus(repositoryPath);

      // Determine files to review
      const filesToReview = this.getFilesToReview(gitStatus, reviewType);

      if (filesToReview.length === 0) {
        return "No files to review. All files are clean!";
      }

      // Perform code review for each file
      const reviewResults: CodeReviewResult["files"] = [];

      for (const filePath of filesToReview) {
        const review = await this.reviewFile(
          filePath,
          repositoryPath,
          includeSuggestions,
          useCodex
        );
        reviewResults.push(review);
      }

      const result: CodeReviewResult = {
        summary: this.generateSummary(gitStatus, reviewResults),
        files: reviewResults,
      };

      // Return results in readable string format
      let output = `📊 Code Review Results\n`;
      output += `=${"=".repeat(50)}\n\n`;
      output += `📋 ${result.summary}\n\n`;

      if (result.files.length > 0) {
        output += `📁 Codex Analysis Results:\n`;
        output += `-`.repeat(50) + `\n`;

        result.files.forEach((file, index) => {
          output += `${index + 1}. ${file.path}\n`;

          // Show Codex analysis context if available
          if (file.codexAnalysis?.context) {
            output += `   🧠 Codex Analysis:\n`;
            output += `   ${file.codexAnalysis.context}\n`;
          } else if (file.status === "skipped" && file.reason) {
            output += `   ⚠️ Skipped: ${file.reason}\n`;
          } else {
            output += `   ⚠️ No Codex analysis available\n`;
          }
          output += `\n`;
        });
      }

      return output;
    } catch (error) {
      // Security: Remove sensitive information from error messages
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Filter error messages containing system information
      if (
        errorMessage.includes("ENOENT") ||
        errorMessage.includes("EACCES") ||
        errorMessage.includes("EPERM") ||
        errorMessage.includes("path") ||
        errorMessage.includes("directory")
      ) {
        throw new Error("File or directory access error occurred");
      }

      throw new Error(`Code review failed: ${errorMessage}`);
    }
  }

  private async analyzeGitStatus(repoPath: string): Promise<GitStatus> {
    try {
      // Security: Safe Git command execution
      const gitStatusOutput = this.safeExecGitCommand(
        "git status --porcelain",
        repoPath
      );
      const branchOutput = this.safeExecGitCommand(
        "git branch --show-current",
        repoPath
      ).trim();
      let ahead = 0;
      let behind = 0;

      try {
        const aheadBehindOutput = this.safeExecGitCommand(
          "git rev-list --left-right --count HEAD@{upstream}...HEAD",
          repoPath
        ).trim();
        [behind, ahead] = aheadBehindOutput.split("\t").map(Number);
      } catch (error) {
        // No upstream branch configured, default to 0/0
        ahead = 0;
        behind = 0;
      }

      const staged: string[] = [];
      const modified: string[] = [];
      const untracked: string[] = [];
      const deleted: string[] = [];

      gitStatusOutput.split("\n").forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Git status format: "XY filename" where XY is 2-char status
        // Find the first space after the status to get filename
        const spaceIndex = trimmedLine.indexOf(" ", 2);
        if (spaceIndex === -1) return;

        const status = trimmedLine.substring(0, 2);
        let filePath = trimmedLine.substring(spaceIndex + 1);

        // Handle rename entries (e.g., "R  old.ts -> new.ts")
        if (filePath.includes(" -> ")) {
          filePath = filePath.split(" -> ")[1];
        }

        const stagedStatus = status[0]; // First column (staged area)
        const workingStatus = status[1]; // Second column (working directory)

        // Staged files (first column)
        if (
          stagedStatus === "A" ||
          stagedStatus === "M" ||
          stagedStatus === "R"
        ) {
          staged.push(filePath);
        }

        // Modified files (second column, including MM status)
        if (workingStatus === "M") {
          modified.push(filePath);
        }

        // Untracked files
        if (stagedStatus === "?" && workingStatus === "?") {
          untracked.push(filePath);
        }

        // Deleted files
        if (stagedStatus === "D" || workingStatus === "D") {
          deleted.push(filePath);
        }
      });

      return {
        branch: branchOutput,
        ahead,
        behind,
        staged,
        modified,
        untracked,
        deleted,
      };
    } catch (error) {
      // Security: Generalize Git-related error messages
      throw new Error("Failed to analyze Git repository");
    }
  }

  private getFilesToReview(gitStatus: GitStatus, reviewType: string): string[] {
    switch (reviewType) {
      case "staged":
        return gitStatus.staged;
      case "modified":
        return [...gitStatus.staged, ...gitStatus.modified];
      case "full":
        return [
          ...gitStatus.staged,
          ...gitStatus.modified,
          ...gitStatus.untracked,
        ];
      default:
        return [...gitStatus.staged, ...gitStatus.modified];
    }
  }

  private async reviewFile(
    filePath: string,
    repoPath: string,
    includeSuggestions: boolean,
    useCodex: boolean
  ): Promise<CodeReviewResult["files"][0]> {
    try {
      // Security: File path validation and normalization
      const validatedRepoPath = this.validateAndNormalizePath(
        repoPath,
        process.cwd()
      );
      const validatedFilePath = this.validateAndNormalizePath(
        filePath,
        validatedRepoPath
      );

      // Security: File access permission check
      if (!this.validateFileAccess(validatedFilePath)) {
        return {
          path: filePath,
          status: "inaccessible",
        };
      }

      const content = readFileSync(validatedFilePath, "utf8");

      // Check if file is suitable for analysis
      const suitabilityCheck = this.isFileSuitableForAnalysis(
        filePath,
        content
      );
      if (!suitabilityCheck.suitable) {
        return {
          path: filePath,
          status: "skipped",
          reason: suitabilityCheck.reason,
        };
      }

      // Perform Codex analysis
      let codexAnalysis:
        | CodeReviewResult["files"][0]["codexAnalysis"]
        | undefined;

      if (useCodex && this.codexAvailable) {
        try {
          codexAnalysis = await this.performCodexAnalysis(
            content,
            filePath,
            includeSuggestions
          );
        } catch (error) {
          console.warn(`Codex analysis failed for ${filePath}:`, error);
        }
      }

      return {
        path: filePath,
        status: "reviewed",
        codexAnalysis,
      };
    } catch (error) {
      // Security: Generalize file processing errors
      return {
        path: filePath,
        status: "error",
      };
    }
  }

  private generateSummary(
    gitStatus: GitStatus,
    files: CodeReviewResult["files"]
  ): string {
    const reviewedFiles = files.filter((file) => file.status === "reviewed");
    const codexAnalyzedFiles = files.filter((file) => file.codexAnalysis);
    const skippedFiles = files.filter((file) => file.status === "skipped");
    const errorFiles = files.filter(
      (file) => file.status === "error" || file.status === "inaccessible"
    );

    let summary = `Reviewed ${reviewedFiles.length} files in branch '${gitStatus.branch}'. `;
    summary += `Codex analyzed: ${codexAnalyzedFiles.length} files.`;

    if (skippedFiles.length > 0) {
      summary += ` Skipped: ${skippedFiles.length} files.`;
    }
    if (errorFiles.length > 0) {
      summary += ` Errors: ${errorFiles.length} files.`;
    }

    return summary;
  }

  // Check if Codex SDK is available
  private async checkCodexAvailability(): Promise<boolean> {
    try {
      // Test Codex SDK by starting a simple thread
      const thread = this.codex.startThread();
      const turn = await thread.run("Hello, are you working?");

      this.codexAvailable = turn.finalResponse !== undefined;
      return this.codexAvailable;
    } catch (error) {
      console.warn("Codex SDK availability check failed:", error);
      this.codexAvailable = false;
      return false;
    }
  }

  // Perform Codex analysis on TypeScript code using Codex SDK
  private async performCodexAnalysis(
    content: string,
    filePath: string,
    includeSuggestions: boolean = true
  ): Promise<CodeReviewResult["files"][0]["codexAnalysis"]> {
    try {
      // Create Codex prompt with file content
      const prompt = this.buildCodexPrompt(
        filePath,
        content,
        includeSuggestions
      );

      // Execute Codex SDK
      const thread = this.codex.startThread();
      const turn = await thread.run(prompt);

      // Parse the result
      return this.parseCodexResponse(
        turn.finalResponse || "",
        includeSuggestions
      );
    } catch (error) {
      throw new Error(
        `Codex analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Build prompt for Codex analysis
  private buildCodexPrompt(
    filePath: string,
    content: string,
    includeSuggestions: boolean = true
  ): string {
    const basePrompt = `Analyze the following TypeScript code and provide a comprehensive code review focusing on:

1. **Context**: What does this code do?
2. **Security Issues**: Any security vulnerabilities or concerns
3. **Performance Issues**: Performance bottlenecks or inefficiencies  
4. **Architecture Issues**: Design patterns, coupling, separation of concerns
5. **Logic Issues**: Potential bugs, edge cases, logical errors`;

    const suggestionsSection = includeSuggestions
      ? `
6. **Suggestions**: Specific improvement recommendations`
      : "";

    // Escape backticks in content to prevent markdown code block conflicts
    const escapedContent = this.escapeCodeBlockDelimiters(content);

    return `${basePrompt}${suggestionsSection}

File: ${filePath}

\`\`\`typescript
${escapedContent}
\`\`\`

Provide detailed analysis with specific examples from the code.`;
  }

  // Escape code block delimiters to prevent markdown conflicts
  private escapeCodeBlockDelimiters(content: string): string {
    // Replace various markdown code block patterns with safe alternatives
    return content
      .replace(/```/g, "\\`\\`\\`") // Triple backticks
      .replace(/``/g, "\\`\\`") // Double backticks
      .replace(/`/g, "\\`"); // Single backticks
  }

  // Parse Codex response
  private parseCodexResponse(
    response: string,
    includeSuggestions: boolean = true
  ): CodeReviewResult["files"][0]["codexAnalysis"] {
    // Extract the actual analysis content (remove Codex CLI headers)
    const lines = response.split("\n");
    const analysisStart = lines.findIndex(
      (line) => line.includes("codex") && !line.includes("OpenAI Codex v")
    );

    let analysisContent = response;
    if (analysisStart !== -1) {
      analysisContent = lines
        .slice(analysisStart + 1)
        .join("\n")
        .trim();
    }

    // Parse structured sections if suggestions are included
    let securityIssues: string[] = [];
    let performanceIssues: string[] = [];
    let architectureIssues: string[] = [];
    let logicIssues: string[] = [];
    let suggestions: string[] = [];

    if (includeSuggestions && analysisContent) {
      // Simple parsing of structured sections
      const sections = analysisContent.split(/\*\*(.*?)\*\*/g);
      for (let i = 1; i < sections.length; i += 2) {
        const sectionName = sections[i]?.toLowerCase() || "";
        const sectionContent = sections[i + 1] || "";

        if (sectionName.includes("security")) {
          securityIssues.push(sectionContent.trim());
        } else if (sectionName.includes("performance")) {
          performanceIssues.push(sectionContent.trim());
        } else if (sectionName.includes("architecture")) {
          architectureIssues.push(sectionContent.trim());
        } else if (sectionName.includes("logic")) {
          logicIssues.push(sectionContent.trim());
        } else if (sectionName.includes("suggestion")) {
          suggestions.push(sectionContent.trim());
        }
      }
    }

    return {
      context: analysisContent,
      securityIssues,
      performanceIssues,
      architectureIssues,
      logicIssues,
      suggestions,
    };
  }
}

export default CodexReviewTool;
