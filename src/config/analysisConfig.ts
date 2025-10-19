import { AnalysisConfig, GitConfig } from "../domain/ports.js";

export const defaultAnalysisConfig: AnalysisConfig = {
  maxFileSize: 50 * 1024, // 50KB
  maxLines: 2500,
  maxFunctions: 50,
  maxClasses: 10,
  concurrency: 3,
  supportedExtensions: [".ts", ".tsx"],
  excludedPatterns: [
    "\\.d\\.ts$",
    "\\.(test|spec)\\.tsx?$",
    "/node_modules/",
    "/dist/",
    "/build/",
  ],
};

export const defaultGitConfig: GitConfig = {
  porcelainMode: true,
  nullTerminated: false,
  includeRenames: false,
};

export function createAnalysisConfig(
  overrides: Partial<AnalysisConfig> = {}
): AnalysisConfig {
  return {
    ...defaultAnalysisConfig,
    ...overrides,
  };
}

export function createGitConfig(overrides: Partial<GitConfig> = {}): GitConfig {
  return {
    ...defaultGitConfig,
    ...overrides,
  };
}
