import { MCPTool } from "mcp-framework";
import { z } from "zod";
import { getContainer, createContainer } from "../composition/container";
import { AnalysisType } from "../strategies/AnalysisStrategyFactory.js";
import { AIClient } from "../domain/ports.js";
import { CodexClient } from "../infrastructure/ai/CodexClient";

interface CodexReviewInput {
  repositoryPath?: string;
  reviewType?: "full" | "staged" | "modified";
  includeSuggestions?: boolean;
  useCodex?: boolean;
  analysisType?: AnalysisType;
  outputFormat?: "text" | "json";
  noEmoji?: boolean;
}

export class CodexReviewTool extends MCPTool {
  private aiClient: AIClient;

  constructor() {
    super();
    // Use provided AIClient or default to CodexClient
    this.aiClient = new CodexClient();
  }

  name = "codex_review";
  description =
    "Perform intelligent code review using various analysis strategies";

  schema = z.object({
    repositoryPath: z
      .string()
      .optional()
      .describe("Path to the Git repository to review"),
    reviewType: z
      .enum(["full", "staged", "modified"])
      .optional()
      .describe("Type of files to review: full(all), staged, or modified"),
    includeSuggestions: z
      .boolean()
      .optional()
      .describe("Whether to include improvement suggestions"),
    useCodex: z
      .boolean()
      .optional()
      .describe(
        "Whether to use Codex AI for intelligent code review (deprecated - use analysisType)"
      ),
    analysisType: z
      .enum(["codex", "static", "hybrid", "accessibility", "toxic-architect"])
      .optional()
      .describe(
        "Analysis strategy: codex(AI), static(rules-based), hybrid(combined), accessibility(web accessibility), toxic-architect(SOLID principles)"
      ),
    outputFormat: z
      .enum(["text", "json"])
      .optional()
      .describe("Output format: text (default) or json"),
    noEmoji: z.boolean().optional().describe("Disable emoji in output"),
  });

  async execute(input: CodexReviewInput): Promise<string> {
    try {
      // Input validation and defaults
      const {
        repositoryPath = process.env.DEFAULT_REPO_PATH || process.cwd(),
        reviewType = "modified",
        includeSuggestions = process.env.DEFAULT_INCLUDE_SUGGESTIONS === "true",
        useCodex = process.env.DEFAULT_USE_CODEX === "true",
        analysisType = (process.env.DEFAULT_ANALYSIS_TYPE as AnalysisType) ||
          "codex",
        outputFormat = "text",
        noEmoji = process.env.NO_EMOJI === "true",
      } = input;

      // Handle deprecated useCodex parameter
      const effectiveAnalysisType = useCodex ? "codex" : analysisType;

      // Validate analysis type
      if (
        ![
          "codex",
          "static",
          "hybrid",
          "accessibility",
          "toxic-architect",
        ].includes(effectiveAnalysisType)
      ) {
        throw new Error("Invalid analysis type");
      }

      // Get dependency container with AIClient injection
      const container = createContainer(undefined, this.aiClient);

      // Execute code review using clean architecture
      const useCase = container.getCodeReviewUseCase(
        repositoryPath,
        effectiveAnalysisType
      );
      const result = await useCase.execute({
        repositoryPath,
        reviewType,
        includeSuggestions,
        analysisType: effectiveAnalysisType,
      });

      // Render output using appropriate reporter
      const reporter =
        outputFormat === "json"
          ? container.getJsonReporter()
          : container.getCliReporter(!noEmoji);

      return reporter.render(result);
    } catch (error) {
      // Provide user-friendly error messages
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("Path traversal")) {
        return "Error: Invalid file path detected. Please ensure all paths are within the repository.";
      }

      if (errorMessage.includes("Git command execution failed")) {
        return "Error: Cannot access Git repository. Please ensure Git is installed and the repository is valid.";
      }

      if (errorMessage.includes("File does not exist")) {
        return "Error: Some files could not be found. Please check the repository state.";
      }

      return `Code review failed: ${errorMessage}`;
    }
  }
}
