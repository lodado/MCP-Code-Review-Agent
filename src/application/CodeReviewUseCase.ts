import { cpus } from "os";
import {
  GitClient,
  FileSystem,
  Analyzer,
  PathPolicy,
  SuitabilityPolicy,
  FileProcessor,
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
    private fileProcessor: FileProcessor,
    private concurrencyLimit: number = Math.max(1, Math.min(8, cpus().length))
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

      // Get files to review (already filtered for TypeScript files)
      const filesToReview = await this.gitClient.filesForReview(
        input.repositoryPath,
        input.reviewType
      );

      // Process files with concurrency limit
      const reviewResults = await this.fileProcessor.processFiles(
        filesToReview,
        (filePath: string) =>
          this.reviewFile(input.repositoryPath, filePath, {
            includeSuggestions: input.includeSuggestions,
            analysisType: input.analysisType,
          }),
        this.concurrencyLimit
      );

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

      console.log("fullPath", fullPath, "~!!~");

      // Check if file exists and is accessible
      if (!(await this.fileSystem.exists(fullPath))) {
        return {
          path: filePath,
          status: "inaccessible",
          reason: "File does not exist",
        };
      }

      // Get file stats first to check size before reading
      const stats = await this.fileSystem.stat(fullPath);

      // Pre-check file size to avoid loading large files
      const maxFileSize = 1024 * 1024; // 1MB limit
      if (stats.size > maxFileSize) {
        return {
          path: filePath,
          status: "skipped",
          reason: `File too large (${stats.size} bytes > ${maxFileSize} bytes)`,
        };
      }

      // Read file content only if size is acceptable
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
    // Single-pass counting for better performance
    let reviewed = 0;
    let skipped = 0;
    let errors = 0;

    for (const file of files) {
      switch (file.status) {
        case "reviewed":
          reviewed++;
          break;
        case "skipped":
          skipped++;
          break;
        case "error":
        case "inaccessible":
          errors++;
          break;
      }
    }

    return `📊 Code Review Results
===================================================

📋 Reviewed ${files.length} files in branch '${gitStatus.branch}'. 
   ✅ Reviewed: ${reviewed} | ⚠️ Skipped: ${skipped} | ❌ Errors: ${errors}`;
  }
}
