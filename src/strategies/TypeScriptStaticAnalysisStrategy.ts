import {
  StaticAnalysisStrategy,
  CodeAnalysisResult,
} from "./CodeAnalysisStrategy.js";

export class TypeScriptStaticAnalysisStrategy extends StaticAnalysisStrategy {
  buildPrompt(
    content: string,
    filePath: string,
    includeSuggestions: boolean
  ): string {
    // For static analysis, we don't need a traditional prompt
    // but we return a description of what we're analyzing
    return `Performing static analysis on TypeScript file: ${filePath}`;
  }

  protected performStaticAnalysis(content: string, filePath: string): string {
    const analysis = this.analyzeTypeScriptCode(content, filePath);
    return this.formatStaticAnalysis(analysis);
  }

  private analyzeTypeScriptCode(
    content: string,
    filePath: string
  ): StaticAnalysisResult {
    const lines = content.split("\n");
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Basic static analysis rules
    this.checkForCommonIssues(content, lines, issues);
    this.generateSuggestions(content, lines, suggestions);

    return {
      context: `Static analysis of ${filePath}`,
      issues,
      suggestions,
      metrics: {
        linesOfCode: lines.length,
        functionCount: this.countFunctions(content),
        classCount: this.countClasses(content),
        complexity: this.calculateComplexity(content),
      },
    };
  }

  private checkForCommonIssues(
    content: string,
    lines: string[],
    issues: string[]
  ): void {
    // Check for console.log statements
    if (content.includes("console.log")) {
      issues.push(
        "Found console.log statements - consider removing for production"
      );
    }

    // Check for TODO comments
    const todoRegex = /\/\/\s*TODO|#\s*TODO/i;
    lines.forEach((line, index) => {
      if (todoRegex.test(line)) {
        issues.push(`TODO comment found at line ${index + 1}: ${line.trim()}`);
      }
    });

    // Check for long functions
    const functionRegex = /function\s+\w+|const\s+\w+\s*=\s*\(/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const functionStart = match.index;
      const functionEnd = this.findFunctionEnd(content, functionStart);
      const functionLines = content
        .substring(functionStart, functionEnd)
        .split("\n").length;

      if (functionLines > 50) {
        issues.push(
          `Long function detected (${functionLines} lines) - consider breaking into smaller functions`
        );
      }
    }
  }

  private generateSuggestions(
    content: string,
    lines: string[],
    suggestions: string[]
  ): void {
    // Suggest adding JSDoc comments for functions without them
    const functionRegex = /function\s+(\w+)|const\s+(\w+)\s*=\s*\(/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2];
      const functionStart = match.index;

      // Check if there's a JSDoc comment before the function
      const beforeFunction = content.substring(
        Math.max(0, functionStart - 200),
        functionStart
      );
      if (!beforeFunction.includes("/**")) {
        suggestions.push(
          `Consider adding JSDoc documentation for function: ${functionName}`
        );
      }
    }

    // Suggest using const instead of let where possible
    const letRegex = /let\s+\w+/g;
    if (letRegex.test(content)) {
      suggestions.push(
        "Consider using const instead of let for variables that are not reassigned"
      );
    }
  }

  private countFunctions(content: string): number {
    return (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;
  }

  private countClasses(content: string): number {
    return (content.match(/class\s+\w+/g) || []).length;
  }

  private calculateComplexity(content: string): number {
    // Simple cyclomatic complexity calculation
    const complexityKeywords = [
      "if",
      "else",
      "for",
      "while",
      "switch",
      "case",
      "catch",
      "&&",
      "||",
    ];
    let complexity = 1; // Base complexity

    complexityKeywords.forEach((keyword) => {
      const matches = content.match(new RegExp(`\\b${keyword}\\b`, "g"));
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  private findFunctionEnd(content: string, start: number): number {
    let braceCount = 0;
    let inString = false;
    let stringChar = "";

    for (let i = start; i < content.length; i++) {
      const char = content[i];

      if (!inString) {
        if (char === '"' || char === "'" || char === "`") {
          inString = true;
          stringChar = char;
        } else if (char === "{") {
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (braceCount === 0) {
            return i + 1;
          }
        }
      } else {
        if (char === stringChar && content[i - 1] !== "\\") {
          inString = false;
        }
      }
    }

    return content.length;
  }

  private formatStaticAnalysis(analysis: StaticAnalysisResult): string {
    let result = `**Context**: ${analysis.context}\n\n`;

    if (analysis.issues.length > 0) {
      result += `**Issues Found**:\n`;
      analysis.issues.forEach((issue) => {
        result += `- ${issue}\n`;
      });
      result += "\n";
    }

    if (analysis.suggestions.length > 0) {
      result += `**Suggestions**:\n`;
      analysis.suggestions.forEach((suggestion) => {
        result += `- ${suggestion}\n`;
      });
      result += "\n";
    }

    result += `**Metrics**:\n`;
    result += `- Lines of Code: ${analysis.metrics.linesOfCode}\n`;
    result += `- Functions: ${analysis.metrics.functionCount}\n`;
    result += `- Classes: ${analysis.metrics.classCount}\n`;
    result += `- Complexity: ${analysis.metrics.complexity}\n`;

    return result;
  }

  parseResponse(response: string): CodeAnalysisResult {
    // For static analysis, the response is already formatted
    return {
      context: response,
      securityIssues: [],
      performanceIssues: [],
      architectureIssues: [],
      logicIssues: [],
      suggestions: [],
    };
  }
}

interface StaticAnalysisResult {
  context: string;
  issues: string[];
  suggestions: string[];
  metrics: {
    linesOfCode: number;
    functionCount: number;
    classCount: number;
    complexity: number;
  };
}
