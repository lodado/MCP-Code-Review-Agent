// Abstract base class for code analysis strategies
export abstract class CodeAnalysisStrategy {
  abstract analyzeCode(content: string, filePath: string): Promise<string>;
  abstract parseResponse(response: string): CodeAnalysisResult;
  abstract buildPrompt(
    content: string,
    filePath: string,
    includeSuggestions: boolean
  ): string;

  // Template method - defines the algorithm structure
  async performAnalysis(
    content: string,
    filePath: string,
    includeSuggestions: boolean
  ): Promise<CodeAnalysisResult> {
    try {
      // Step 1: Build the analysis prompt
      const prompt = this.buildPrompt(content, filePath, includeSuggestions);

      // Step 2: Execute the analysis (delegated to subclass)
      const response = await this.analyzeCode(content, filePath);

      // Step 3: Parse the response (delegated to subclass)
      return this.parseResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Common error handling
  protected handleError(error: unknown): CodeAnalysisResult {
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

// Interface for analysis results
export interface CodeAnalysisResult {
  context: string;
  securityIssues: string[];
  performanceIssues: string[];
  architectureIssues: string[];
  logicIssues: string[];
  suggestions: string[];
}

// Abstract class for AI-based analysis
export abstract class AIAnalysisStrategy extends CodeAnalysisStrategy {
  protected abstract getAIProvider(): any; // Codex, OpenAI, etc.

  async analyzeCode(content: string, filePath: string): Promise<string> {
    const aiProvider = this.getAIProvider();
    const prompt = this.buildPrompt(content, filePath, true);

    // Execute AI analysis
    const thread = aiProvider.startThread();
    const turn = await thread.run(prompt);

    return turn.finalResponse || "";
  }
}

// Abstract class for static analysis
export abstract class StaticAnalysisStrategy extends CodeAnalysisStrategy {
  async analyzeCode(content: string, filePath: string): Promise<string> {
    // Perform static analysis without AI
    return this.performStaticAnalysis(content, filePath);
  }

  protected abstract performStaticAnalysis(
    content: string,
    filePath: string
  ): string;
}
