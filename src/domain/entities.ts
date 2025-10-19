import {
  GitStatus,
  ReviewStatus,
  AnalyzableFile,
  AnalysisResult,
  SuitabilityResult,
  AnalysisConfig,
} from "./ports.js";

// Domain entities with business logic
export class FileSuitabilityChecker {
  constructor(private config: AnalysisConfig) {}

  check(path: string, content: string): SuitabilityResult {
    // Check file extension
    const hasValidExtension = this.config.supportedExtensions.some((ext) =>
      path.toLowerCase().endsWith(ext.toLowerCase())
    );

    if (!hasValidExtension) {
      return { suitable: false, reason: "Unsupported file type" };
    }

    // Check excluded patterns
    const isExcluded = this.config.excludedPatterns.some((pattern) =>
      new RegExp(pattern, "i").test(path)
    );

    if (isExcluded) {
      return { suitable: false, reason: "File matches excluded pattern" };
    }

    // Check file size (content length as bytes approximation)
    const contentBytes = Buffer.byteLength(content, "utf8");
    if (contentBytes > this.config.maxFileSize) {
      return {
        suitable: false,
        reason: `File too large (${contentBytes} bytes > ${this.config.maxFileSize} bytes)`,
      };
    }

    // Check line count
    const lines = content.split("\n").length;
    if (lines > this.config.maxLines) {
      return {
        suitable: false,
        reason: `Too many lines (${lines} > ${this.config.maxLines})`,
      };
    }

    // Check function count
    const functionCount = (
      content.match(/\bfunction\s+\w+|\bconst\s+\w+\s*=\s*\(/g) || []
    ).length;
    if (functionCount > this.config.maxFunctions) {
      return {
        suitable: false,
        reason: `Too many functions (${functionCount} > ${this.config.maxFunctions})`,
      };
    }

    // Check class count
    const classCount = (content.match(/\bclass\s+\w+/g) || []).length;
    if (classCount > this.config.maxClasses) {
      return {
        suitable: false,
        reason: `Too many classes (${classCount} > ${this.config.maxClasses})`,
      };
    }

    return { suitable: true };
  }
}

export class ReviewSummaryBuilder {
  static build(
    gitStatus: GitStatus,
    files: Array<{ status: ReviewStatus }>
  ): string {
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

export class FilePathValidator {
  static validateAndNormalize(basePath: string, inputPath: string): string {
    const resolvedPath = require("path").resolve(basePath, inputPath);
    const normalizedBase = require("path").resolve(basePath);
    const normalizedResolved = require("path").resolve(resolvedPath);

    // Check for path traversal
    if (!normalizedResolved.startsWith(normalizedBase)) {
      throw new Error(`Path traversal detected: ${inputPath}`);
    }

    return normalizedResolved;
  }
}

export class AnalysisResultMerger {
  static merge(results: AnalysisResult[]): AnalysisResult {
    return {
      context: results.map((r) => r.context).join("\n\n"),
      securityIssues: results.flatMap((r) => r.securityIssues),
      performanceIssues: results.flatMap((r) => r.performanceIssues),
      architectureIssues: results.flatMap((r) => r.architectureIssues),
      logicIssues: results.flatMap((r) => r.logicIssues),
      suggestions: results.flatMap((r) => r.suggestions),
    };
  }
}
