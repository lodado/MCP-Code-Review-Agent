import pLimit from "p-limit";
import {
  GitClient,
  FileSystem,
  Analyzer,
  PathPolicy,
  SuitabilityPolicy,
  ReviewType,
  AnalyzableFile,
  AnalysisOptions,
  ReviewedFile,
  CodeReviewResult,
  GitStatus,
} from "../domain/ports.js";

export class CodeReviewUseCase {
  constructor(
    private gitClient: GitClient,
    private fileSystem: FileSystem,
    private analyzer: Analyzer,
    private pathPolicy: PathPolicy,
    private suitabilityPolicy: SuitabilityPolicy,
    private concurrencyLimit: number = 3
  ) {}

  async execute(input: {
    repositoryPath: string;
    reviewType: ReviewType;
    includeSuggestions: boolean;
    analysisType: string;
  }): Promise<CodeReviewResult> {
    try {
      // Get Git status
      const gitStatus = await this.gitClient.status(input.repositoryPath);

      // Get files to review
      const filesToReview = await this.gitClient.filesForReview(
        input.repositoryPath,
        input.reviewType
      );

      // Filter TypeScript files
      const tsFiles = filesToReview.filter(
        (file: string) => file.endsWith(".ts") || file.endsWith(".tsx")
      );

      // Remove duplicates
      const uniqueFiles = Array.from(new Set(tsFiles));

      // Process files with concurrency limit
      const limit = pLimit(this.concurrencyLimit);
      const reviewPromises = uniqueFiles.map((filePath: string) =>
        limit(async () =>
          this.reviewFile(input.repositoryPath, filePath, {
            includeSuggestions: input.includeSuggestions,
            analysisType: input.analysisType,
          })
        )
      );

      const reviewResults = await Promise.all(reviewPromises);

      // Build summary
      const summary = this.buildSummary(gitStatus, reviewResults);

      return {
        summary,
        files: reviewResults,
        gitStatus,
      };
    } catch (error) {
      throw new Error(
        `Code review failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async reviewFile(
    repositoryPath: string,
    filePath: string,
    options: AnalysisOptions
  ): Promise<ReviewedFile> {
    try {
      // Resolve and validate path
      const fullPath = this.pathPolicy.resolve(repositoryPath, filePath);

      // Check if file exists and is accessible
      if (!(await this.fileSystem.exists(fullPath))) {
        return {
          path: filePath,
          status: "inaccessible",
          reason: "File does not exist",
        };
      }

      // Read file content
      const content = await this.fileSystem.read(fullPath);

      // Check file suitability
      const suitability = this.suitabilityPolicy.check(filePath, content);
      if (!suitability.suitable) {
        return {
          path: filePath,
          status: "skipped",
          reason: suitability.reason,
        };
      }

      // Perform analysis
      const analysis = await this.analyzer.analyze(
        { path: filePath, content },
        options
      );

      return {
        path: filePath,
        status: "reviewed",
        analysis,
      };
    } catch (error) {
      return {
        path: filePath,
        status: "error",
        reason: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private buildSummary(gitStatus: GitStatus, files: ReviewedFile[]): string {
    const reviewed = files.filter((f) => f.status === "reviewed").length;
    const skipped = files.filter((f) => f.status === "skipped").length;
    const errors = files.filter(
      (f) => f.status === "error" || f.status === "inaccessible"
    ).length;

    return `📊 Code Review Results
===================================================

📋 Reviewed ${files.length} files in branch '${gitStatus.branch}'. 
   ✅ Reviewed: ${reviewed} | ⚠️ Skipped: ${skipped} | ❌ Errors: ${errors}`;
  }
}
