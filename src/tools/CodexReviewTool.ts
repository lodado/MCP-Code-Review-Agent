import { MCPTool } from "mcp-framework";
import { z } from "zod";
import { execSync } from "child_process";
import {
  readFileSync,
  existsSync,
  accessSync,
  constants,
  statSync,
  realpathSync,
} from "fs";
import { join, resolve, normalize, relative } from "path";

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
    issues: Array<{
      type: "error" | "warning" | "suggestion";
      line?: number;
      message: string;
      suggestion?: string;
      category?:
        | "security"
        | "performance"
        | "architecture"
        | "logic"
        | "style";
    }>;
    score: number;
    codexAnalysis?: {
      context: string;
      securityIssues: string[];
      performanceIssues: string[];
      architectureIssues: string[];
      logicIssues: string[];
      suggestions: string[];
    };
  }>;
  overallScore: number;
  recommendations: string[];
}

class CodexReviewTool extends MCPTool<CodexReviewInput> {
  name = "codex_review";
  description =
    "Analyzes Git status to perform intelligent code review using Codex CLI for TypeScript files";

  // Codex CLI availability check
  private codexAvailable: boolean = false;

  // Maximum file size (1MB)
  private readonly MAX_FILE_SIZE = 1024 * 1024;

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
    if (relativePath.startsWith("..") || relativePath.includes("..")) {
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

  schema = {
    repositoryPath: {
      type: z.string().optional(),
      description: "Repository path to review (default: current directory)",
    },
    reviewType: {
      type: z.enum(["full", "staged", "modified"]).optional(),
      description:
        "Review type: full(all), staged(staged files), modified(modified files)",
    },
    includeSuggestions: {
      type: z.boolean().optional(),
      description: "Whether to include improvement suggestions",
    },
    useCodex: {
      type: z.boolean().optional(),
      description: "Whether to use Codex AI for intelligent code review",
    },
  };

  async execute(input: CodexReviewInput): Promise<string> {
    const {
      repositoryPath = process.cwd(),
      reviewType = "modified",
      includeSuggestions = true,
      useCodex = true,
    } = input;

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

      // Calculate overall score
      const overallScore = this.calculateOverallScore(reviewResults);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        reviewResults,
        gitStatus
      );

      const result: CodeReviewResult = {
        summary: this.generateSummary(gitStatus, reviewResults, overallScore),
        files: reviewResults,
        overallScore,
        recommendations,
      };

      // Return results in readable string format
      let output = `📊 Code Review Results\n`;
      output += `=${"=".repeat(50)}\n\n`;
      output += `📋 ${result.summary}\n\n`;

      if (result.files.length > 0) {
        output += `📁 Detailed Results by File:\n`;
        output += `-`.repeat(50) + `\n`;

        result.files.forEach((file, index) => {
          output += `${index + 1}. ${file.path} (Score: ${file.score}/100)\n`;

          // Show Codex analysis context if available
          if (file.codexAnalysis?.context) {
            output += `   🧠 Context: ${file.codexAnalysis.context}\n`;
          }

          if (file.issues.length > 0) {
            // Group issues by category
            const issuesByCategory = file.issues.reduce((acc, issue) => {
              const category = issue.category || "general";
              if (!acc[category]) acc[category] = [];
              acc[category].push(issue);
              return acc;
            }, {} as Record<string, typeof file.issues>);

            Object.entries(issuesByCategory).forEach(([category, issues]) => {
              const categoryIcon =
                {
                  security: "🔒",
                  performance: "⚡",
                  architecture: "🏗️",
                  logic: "🧩",
                  style: "🎨",
                  general: "📝",
                }[category] || "📝";

              output += `   ${categoryIcon} ${category.toUpperCase()}:\n`;

              issues.forEach((issue) => {
                const icon =
                  issue.type === "error"
                    ? "❌"
                    : issue.type === "warning"
                    ? "⚠️"
                    : "💡";
                const lineInfo = issue.line ? ` (Line ${issue.line})` : "";
                output += `      ${icon} ${issue.message}${lineInfo}\n`;
                if (issue.suggestion) {
                  output += `         💭 Suggestion: ${issue.suggestion}\n`;
                }
              });
            });
          } else {
            output += `   ✅ No issues\n`;
          }
          output += `\n`;
        });
      }

      if (result.recommendations.length > 0) {
        output += `💡 Recommendations:\n`;
        output += `-`.repeat(50) + `\n`;
        result.recommendations.forEach((rec, index) => {
          output += `${index + 1}. ${rec}\n`;
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

        const status = trimmedLine.substring(0, 2);
        let filePath = trimmedLine.substring(3);

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

        // Modified files (second column, not staged)
        if (workingStatus === "M" && stagedStatus !== "M") {
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

      // Only process TypeScript files
      const extension = filePath.split(".").pop()?.toLowerCase();
      if (extension !== "ts" && extension !== "tsx") {
        return {
          path: filePath,
          status: "skipped",
          issues: [
            {
              type: "warning",
              message: "Only TypeScript files (.ts, .tsx) are supported",
            },
          ],
          score: 100, // Don't penalize skipped files
        };
      }

      // Security: File access permission check
      if (!this.validateFileAccess(validatedFilePath)) {
        return {
          path: filePath,
          status: "inaccessible",
          issues: [
            {
              type: "error",
              message: "Cannot access file",
            },
          ],
          score: 0,
        };
      }

      const content = readFileSync(validatedFilePath, "utf8");
      const issues: CodeReviewResult["files"][0]["issues"] = [];

      // Perform Codex analysis
      let codexAnalysis:
        | CodeReviewResult["files"][0]["codexAnalysis"]
        | undefined;

      if (useCodex && this.codexAvailable) {
        try {
          codexAnalysis = await this.performCodexAnalysis(content, filePath);

          // Convert Codex analysis to issues only if suggestions are enabled
          if (includeSuggestions) {
            this.convertCodexAnalysisToIssues(codexAnalysis, issues);
          }
        } catch (error) {
          console.warn(`Codex analysis failed for ${filePath}:`, error);
        }
      }

      const score = this.calculateFileScore(issues);

      return {
        path: filePath,
        status: "reviewed",
        issues,
        score,
        codexAnalysis,
      };
    } catch (error) {
      // Security: Generalize file processing errors
      return {
        path: filePath,
        status: "error",
        issues: [
          {
            type: "error",
            message: "Error occurred while processing file",
          },
        ],
        score: 0,
      };
    }
  }

  private calculateFileScore(
    issues: CodeReviewResult["files"][0]["issues"]
  ): number {
    if (issues.length === 0) return 100;

    let score = 100;
    issues.forEach((issue) => {
      switch (issue.type) {
        case "error":
          score -= 20;
          break;
        case "warning":
          score -= 10;
          break;
        case "suggestion":
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  private calculateOverallScore(files: CodeReviewResult["files"]): number {
    if (files.length === 0) return 100;

    // Only include non-skipped files in score calculation
    const reviewableFiles = files.filter((file) => file.status !== "skipped");
    if (reviewableFiles.length === 0) return 100;

    const totalScore = reviewableFiles.reduce(
      (sum, file) => sum + file.score,
      0
    );
    return Math.round(totalScore / reviewableFiles.length);
  }

  private generateSummary(
    gitStatus: GitStatus,
    files: CodeReviewResult["files"],
    overallScore: number
  ): string {
    const totalIssues = files.reduce(
      (sum, file) => sum + file.issues.length,
      0
    );
    const errorCount = files.reduce(
      (sum, file) =>
        sum + file.issues.filter((issue) => issue.type === "error").length,
      0
    );
    const warningCount = files.reduce(
      (sum, file) =>
        sum + file.issues.filter((issue) => issue.type === "warning").length,
      0
    );

    return (
      `Reviewed ${files.length} files in branch '${gitStatus.branch}'. ` +
      `Overall score: ${overallScore}/100. ` +
      `Issues found: ${totalIssues} (Errors: ${errorCount}, Warnings: ${warningCount})`
    );
  }

  private generateRecommendations(
    files: CodeReviewResult["files"],
    gitStatus: GitStatus
  ): string[] {
    const recommendations: string[] = [];

    // Git status-based recommendations
    if (gitStatus.ahead > 0) {
      recommendations.push(
        `You have ${gitStatus.ahead} commits locally. Consider pushing to remote repository.`
      );
    }

    if (gitStatus.behind > 0) {
      recommendations.push(
        `Remote repository has ${gitStatus.behind} new commits. Consider pulling.`
      );
    }

    if (gitStatus.untracked.length > 0) {
      recommendations.push(
        `${gitStatus.untracked.length} untracked files found. Add to .gitignore or commit them.`
      );
    }

    // Code quality-based recommendations
    const lowScoreFiles = files.filter((file) => file.score < 70);
    if (lowScoreFiles.length > 0) {
      recommendations.push(
        `${lowScoreFiles.length} files have low scores. Code quality improvement needed.`
      );
    }

    const filesWithErrors = files.filter((file) =>
      file.issues.some((issue) => issue.type === "error")
    );
    if (filesWithErrors.length > 0) {
      recommendations.push(
        `${filesWithErrors.length} files have errors. Fix them as priority.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Code quality is good!");
    }

    return recommendations;
  }

  // Check if Codex CLI is available
  private async checkCodexAvailability(): Promise<boolean> {
    try {
      execSync("codex --version", { stdio: "pipe" });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Perform Codex analysis on TypeScript code using Codex CLI
  private async performCodexAnalysis(
    content: string,
    filePath: string
  ): Promise<CodeReviewResult["files"][0]["codexAnalysis"]> {
    try {
      // Create Codex prompt with file content
      const prompt = this.buildCodexPrompt(filePath, content);

      // Execute Codex CLI
      const result = await this.executeCodexCLI(prompt, filePath);

      // Parse the result
      return this.parseCodexResponse(result);
    } catch (error) {
      throw new Error(
        `Codex analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Execute Codex CLI with prompt
  private async executeCodexCLI(
    prompt: string,
    filePath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Use execSync with proper argument handling
        const output = execSync(`codex exec`, {
          input: prompt,
          cwd: process.cwd(),
          encoding: "utf8",
          timeout: 1200000, // 2 minute timeout
          maxBuffer: 1024 * 1024, // 1MB buffer
        });
        resolve(output);
      } catch (error) {
        reject(
          new Error(
            `Codex CLI execution failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          )
        );
      }
    });
  }

  // Build prompt for Codex analysis
  private buildCodexPrompt(filePath: string, content: string): string {
    return `Analyze the following TypeScript code and provide a comprehensive code review focusing on:

1. **Context**: What does this code do?
2. **Security Issues**: Any security vulnerabilities or concerns
3. **Performance Issues**: Performance bottlenecks or inefficiencies  
4. **Architecture Issues**: Design patterns, coupling, separation of concerns
5. **Logic Issues**: Potential bugs, edge cases, logical errors
6. **Suggestions**: Specific improvement recommendations

File: ${filePath}

\`\`\`typescript
${content}
\`\`\`

Provide detailed analysis with specific examples from the code.`;
  }

  // Parse Codex response
  private parseCodexResponse(
    response: string
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

    return {
      context: analysisContent,
      securityIssues: [],
      performanceIssues: [],
      architectureIssues: [],
      logicIssues: [],
      suggestions: [],
    };
  }

  // Convert Codex analysis to issues
  private convertCodexAnalysisToIssues(
    analysis: CodeReviewResult["files"][0]["codexAnalysis"],
    issues: CodeReviewResult["files"][0]["issues"]
  ): void {
    if (!analysis) return;

    // Add the natural language analysis as a single comprehensive issue
    issues.push({
      type: "suggestion",
      message: "Codex Analysis",
      category: "style",
      suggestion: analysis.context,
    });
  }
}

export default CodexReviewTool;
