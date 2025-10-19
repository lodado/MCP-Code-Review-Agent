import {
  AIAnalysisStrategy,
  CodeAnalysisResult,
} from "./CodeAnalysisStrategy.js";
import { AIClient } from "../domain/ports.js";

export class CodexAnalysisStrategy extends AIAnalysisStrategy {
  private aiClient: AIClient;

  constructor(aiClient: AIClient) {
    super();
    this.aiClient = aiClient;
  }

  protected getAIProvider(): AIClient {
    return this.aiClient;
  }

  buildPrompt(
    content: string,
    filePath: string,
    includeSuggestions: boolean
  ): string {
    const basePrompt = `Analyze the following TypeScript code and provide a comprehensive code review focusing on:

1. **Context**: What does this code do?
2. **Security Issues**: Any security vulnerabilities or concerns
3. **Performance Issues**: Performance bottlenecks or inefficiencies  
4. **Architecture Issues**: Design patterns, coupling, separation of concerns
5. **Logic Issues**: Potential bugs, edge cases, logical errors

Note: Do not include barrel export related content in your analysis.`;

    const suggestionsSection = includeSuggestions
      ? `
6. **Suggestions**: Specific improvement recommendations`
      : "";

    // Escape backticks in content to prevent markdown code block conflicts
    const escapedContent = this.escapeCodeBlockDelimiters(content);

    return `${basePrompt}${suggestionsSection}

File: ${filePath}

\`\`\`typescript
${escapedContent}
\`\`\`

Provide detailed analysis with specific examples from the code.`;
  }

  parseResponse(response: string): CodeAnalysisResult {
    // Extract the actual analysis content (remove Codex CLI headers)
    const lines = response.split("\n");
    const analysisStart = lines.findIndex(
      (line) => line.includes("codex") && !line.includes("OpenAI Codex v")
    );

    let analysisContent = response;
    if (analysisStart !== -1) {
      analysisContent = lines
        .slice(analysisStart + 1)
        .join("\n")
        .trim();
    }

    // Parse structured sections
    let securityIssues: string[] = [];
    let performanceIssues: string[] = [];
    let architectureIssues: string[] = [];
    let logicIssues: string[] = [];
    let suggestions: string[] = [];

    if (analysisContent) {
      // Simple parsing of structured sections
      const sections = analysisContent.split(/\*\*(.*?)\*\*/g);
      for (let i = 1; i < sections.length; i += 2) {
        const sectionName = sections[i]?.toLowerCase() || "";
        const sectionContent = sections[i + 1] || "";

        if (sectionName.includes("security")) {
          securityIssues.push(sectionContent.trim());
        } else if (sectionName.includes("performance")) {
          performanceIssues.push(sectionContent.trim());
        } else if (sectionName.includes("architecture")) {
          architectureIssues.push(sectionContent.trim());
        } else if (sectionName.includes("logic")) {
          logicIssues.push(sectionContent.trim());
        } else if (sectionName.includes("suggestion")) {
          suggestions.push(sectionContent.trim());
        }
      }
    }

    return {
      context: analysisContent,
      securityIssues,
      performanceIssues,
      architectureIssues,
      logicIssues,
      suggestions,
    };
  }

  // Escape code block delimiters to prevent markdown conflicts
  private escapeCodeBlockDelimiters(content: string): string {
    // Replace various markdown code block patterns with safe alternatives
    return content
      .replace(/```/g, "\\`\\`\\`") // Triple backticks
      .replace(/``/g, "\\`\\`") // Double backticks
      .replace(/`/g, "\\`"); // Single backticks
  }
}
