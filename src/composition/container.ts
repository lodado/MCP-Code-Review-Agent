import {
  GitClient,
  FileSystem,
  Analyzer,
  PathPolicy,
  SuitabilityPolicy,
  FileProcessor,
  Reporter,
  AnalysisConfig,
} from "../domain/ports.js";

import { NodeGitClient } from "../infrastructure/git/NodeGitClient.js";
import { NodeFileSystem } from "../infrastructure/filesystem/NodeFileSystem.js";
import { CodexClient } from "../infrastructure/ai/CodexClient.js";
import { SafePathPolicy } from "../infrastructure/path/SafePathPolicy.js";
import { ConcurrentFileProcessor } from "../infrastructure/processing/ConcurrentFileProcessor.js";

import { CodeReviewUseCase } from "../application/CodeReviewUseCase.js";
import { AnalysisOrchestrator } from "../application/AnalysisOrchestrator.js";

import { CliReporter } from "../presentation/CliReporter.js";
import { JsonReporter } from "../presentation/JsonReporter.js";

import { FileSuitabilityChecker } from "../domain/entities.js";
import { createAnalysisConfig } from "../config/analysisConfig.js";

export class DependencyContainer {
  private instances: Map<string, any> = new Map();

  constructor(private config: AnalysisConfig = createAnalysisConfig()) {}

  // Infrastructure layer
  getGitClient(repoPath: string): GitClient {
    const key = `gitClient_${repoPath}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, new NodeGitClient(repoPath));
    }
    return this.instances.get(key);
  }

  getFileSystem(): FileSystem {
    if (!this.instances.has("fileSystem")) {
      this.instances.set("fileSystem", new NodeFileSystem());
    }
    return this.instances.get("fileSystem");
  }

  getAIClient(): any {
    if (!this.instances.has("aiClient")) {
      this.instances.set("aiClient", new CodexClient());
    }
    return this.instances.get("aiClient");
  }

  getPathPolicy(): PathPolicy {
    if (!this.instances.has("pathPolicy")) {
      this.instances.set("pathPolicy", new SafePathPolicy());
    }
    return this.instances.get("pathPolicy");
  }

  getSuitabilityPolicy(): SuitabilityPolicy {
    if (!this.instances.has("suitabilityPolicy")) {
      this.instances.set(
        "suitabilityPolicy",
        new FileSuitabilityChecker(this.config)
      );
    }
    return this.instances.get("suitabilityPolicy");
  }

  getFileProcessor(): FileProcessor {
    if (!this.instances.has("fileProcessor")) {
      this.instances.set("fileProcessor", new ConcurrentFileProcessor());
    }
    return this.instances.get("fileProcessor");
  }

  // Application layer
  getAnalyzer(analysisType: string = "codex"): Analyzer {
    const key = `analyzer_${analysisType}`;
    if (!this.instances.has(key)) {
      const aiClient = this.getAIClient();
      const orchestrator = new AnalysisOrchestrator(analysisType, aiClient);
      this.instances.set(key, orchestrator);
    }
    return this.instances.get(key);
  }

  getCodeReviewUseCase(
    repoPath: string,
    analysisType: string = "codex"
  ): CodeReviewUseCase {
    const key = `useCase_${repoPath}_${analysisType}`;
    if (!this.instances.has(key)) {
      this.instances.set(
        key,
        new CodeReviewUseCase(
          this.getGitClient(repoPath),
          this.getFileSystem(),
          this.getAnalyzer(analysisType),
          this.getPathPolicy(),
          this.getSuitabilityPolicy(),
          this.getFileProcessor(),
          this.config.concurrency
        )
      );
    }
    return this.instances.get(key);
  }

  // Presentation layer
  getCliReporter(useEmoji: boolean = true): Reporter {
    const key = `cliReporter_${useEmoji}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, new CliReporter(useEmoji));
    }
    return this.instances.get(key);
  }

  getJsonReporter(): Reporter {
    if (!this.instances.has("jsonReporter")) {
      this.instances.set("jsonReporter", new JsonReporter());
    }
    return this.instances.get("jsonReporter");
  }

  // Configuration
  updateConfig(newConfig: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Clear cached instances that depend on config
    this.instances.delete("suitabilityPolicy");
  }

  getConfig(): AnalysisConfig {
    return { ...this.config };
  }
}

// Singleton instance for global access
let globalContainer: DependencyContainer | null = null;

export function getContainer(): DependencyContainer {
  if (!globalContainer) {
    globalContainer = new DependencyContainer();
  }
  return globalContainer;
}

export function createContainer(config?: AnalysisConfig): DependencyContainer {
  return new DependencyContainer(config);
}
