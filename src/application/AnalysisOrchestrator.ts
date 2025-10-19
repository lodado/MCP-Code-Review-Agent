import {
  Analyzer,
  AnalyzableFile,
  AnalysisOptions,
  AnalysisResult,
  AIClient,
} from "../domain/ports";
import { AnalysisStrategyFactory } from "../strategies/AnalysisStrategyFactory";

export class AnalysisOrchestrator implements Analyzer {
  constructor(
    private analysisType: string = "codex",
    private aiClient?: AIClient
  ) {}

  async analyze(
    file: AnalyzableFile,
    options: AnalysisOptions
  ): Promise<AnalysisResult> {
    try {
      // Create strategy based on analysis type
      const strategy = AnalysisStrategyFactory.createStrategy(
        this.analysisType as any,
        this.aiClient
      );

      // Perform analysis using the strategy
      const result = await strategy.performAnalysis(
        file.content,
        file.path,
        options.includeSuggestions
      );

      return {
        context: result.context,
        securityIssues: result.securityIssues,
        performanceIssues: result.performanceIssues,
        architectureIssues: result.architectureIssues,
        logicIssues: result.logicIssues,
        suggestions: result.suggestions,
      };
    } catch (error) {
      return {
        context: `Analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        securityIssues: [],
        performanceIssues: [],
        architectureIssues: [],
        logicIssues: [],
        suggestions: [],
      };
    }
  }

  setAnalysisType(type: string): void {
    this.analysisType = type;
  }
}
