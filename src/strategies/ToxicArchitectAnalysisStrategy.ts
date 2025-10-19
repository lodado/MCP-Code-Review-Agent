import { AIAnalysisStrategy, CodeAnalysisResult } from "./CodeAnalysisStrategy";
import { AIClient } from "../domain/ports";

export class ToxicArchitectAnalysisStrategy extends AIAnalysisStrategy {
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
    const basePrompt = `You are a TOXIC Senior Software Architect with 15+ years of experience who is brutally honest and has zero tolerance for poor code quality. Your personality is:
- Sarcastic and condescending
- Extremely critical of bad practices
- Uses harsh language and strong opinions
- Expects perfection and calls out mediocrity
- Has no patience for excuses or "good enough" code

Analyze the following TypeScript code with a focus on:

1. **SOLID Principles Violations**:
   - Single Responsibility Principle (SRP) violations
   - Open/Closed Principle (OCP) violations  
   - Liskov Substitution Principle (LSP) violations
   - Interface Segregation Principle (ISP) violations
   - Dependency Inversion Principle (DIP) violations

2. **Clean Architecture Violations**:
   - Poor separation of concerns
   - Tight coupling between layers
   - Dependency direction violations
   - Business logic mixed with infrastructure
   - Lack of proper abstractions

3. **Code Quality Issues**:
   - Low cohesion and high coupling
   - God objects and classes
   - Violation of DRY principle
   - Poor naming conventions
   - Inconsistent patterns

4. **Design Pattern Misuse**:
   - Anti-patterns and code smells
   - Missing or incorrect design patterns
   - Over-engineering or under-engineering
   - Poor abstraction choices`;

    const suggestionsSection = includeSuggestions
      ? `
5. **How to Fix This Mess**:
   - Specific refactoring recommendations
   - Better architectural approaches
   - Design patterns that should be applied
   - Concrete code examples of proper implementation`
      : "";

    // Escape backticks in content to prevent markdown code block conflicts
    const escapedContent = this.escapeCodeBlockDelimiters(content);

    return `${basePrompt}${suggestionsSection}

File: ${filePath}

\`\`\`typescript
${escapedContent}
\`\`\`

Be brutally honest and don't hold back. Point out every architectural flaw, SOLID principle violation, and design mistake. Use a condescending tone and make it clear that this code needs serious work. Provide specific, actionable criticism with examples of how it should be done properly.`;
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

    // Parse structured sections for architecture-focused analysis
    let securityIssues: string[] = [];
    let performanceIssues: string[] = [];
    let architectureIssues: string[] = [];
    let logicIssues: string[] = [];
    let suggestions: string[] = [];

    if (analysisContent) {
      // Parse architecture-specific sections
      const sections = analysisContent.split(/\*\*(.*?)\*\*/g);
      for (let i = 1; i < sections.length; i += 2) {
        const sectionName = sections[i]?.toLowerCase() || "";
        const sectionContent = sections[i + 1] || "";

        if (
          sectionName.includes("solid") ||
          sectionName.includes("principle")
        ) {
          securityIssues.push(sectionContent.trim()); // Use securityIssues for SOLID violations
        } else if (
          sectionName.includes("architecture") ||
          sectionName.includes("clean")
        ) {
          performanceIssues.push(sectionContent.trim()); // Use performanceIssues for architecture issues
        } else if (
          sectionName.includes("quality") ||
          sectionName.includes("coupling")
        ) {
          architectureIssues.push(sectionContent.trim()); // Use architectureIssues for code quality
        } else if (
          sectionName.includes("pattern") ||
          sectionName.includes("design")
        ) {
          logicIssues.push(sectionContent.trim()); // Use logicIssues for design patterns
        } else if (
          sectionName.includes("fix") ||
          sectionName.includes("recommendation")
        ) {
          suggestions.push(sectionContent.trim());
        }
      }
    }

    return {
      context: analysisContent,
      securityIssues, // SOLID violations
      performanceIssues, // Architecture issues
      architectureIssues, // Code quality issues
      logicIssues, // Design pattern issues
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
