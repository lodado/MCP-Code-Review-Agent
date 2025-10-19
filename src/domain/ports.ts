// Domain ports - interfaces that define contracts for external dependencies
export interface GitClient {
  status(repoPath: string): Promise<GitStatus>;
  filesForReview(repoPath: string, type: ReviewType): Promise<string[]>;
}

export interface FileSystem {
  read(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FileStats>;
  realPath(path: string): Promise<string>;
}

export interface AIClient {
  analyze(prompt: string): Promise<string>;
}

export interface FileSelector {
  select(gitStatus: GitStatus, type: ReviewType): string[];
}

export interface Analyzer {
  analyze(
    file: AnalyzableFile,
    options: AnalysisOptions
  ): Promise<AnalysisResult>;
}

export interface Reporter {
  render(result: CodeReviewResult): string;
}

export interface PathPolicy {
  resolve(basePath: string, inputPath: string): string;
  isAllowed(path: string): boolean;
}

export interface SuitabilityPolicy {
  check(path: string, content: string): SuitabilityResult;
}

// Domain types
export type ReviewType = "staged" | "modified" | "full";

export type ReviewStatus = "reviewed" | "skipped" | "inaccessible" | "error";

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
}

export interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
}

export interface AnalyzableFile {
  path: string;
  content: string;
}

export interface AnalysisOptions {
  includeSuggestions: boolean;
  analysisType: string;
}

export interface AnalysisResult {
  context: string;
  securityIssues: string[];
  performanceIssues: string[];
  architectureIssues: string[];
  logicIssues: string[];
  suggestions: string[];
}

export interface SuitabilityResult {
  suitable: boolean;
  reason?: string;
}

export interface ReviewedFile {
  path: string;
  status: ReviewStatus;
  reason?: string;
  analysis?: AnalysisResult;
}

export interface CodeReviewResult {
  summary: string;
  files: ReviewedFile[];
  gitStatus: GitStatus;
}

// Configuration types
export interface AnalysisConfig {
  maxFileSize: number;
  maxLines: number;
  maxFunctions: number;
  maxClasses: number;
  concurrency: number;
  supportedExtensions: string[];
  excludedPatterns: string[];
}

export interface GitConfig {
  porcelainMode: boolean;
  nullTerminated: boolean;
  includeRenames: boolean;
}
