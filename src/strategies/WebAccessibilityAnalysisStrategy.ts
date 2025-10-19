import {
  AIAnalysisStrategy,
  CodeAnalysisResult,
} from "./CodeAnalysisStrategy.js";
import { AIClient } from "../domain/ports.js";

export class WebAccessibilityAnalysisStrategy extends AIAnalysisStrategy {
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
    const basePrompt = `You are a Senior Frontend Publisher with 10+ years of experience in web accessibility and semantic web development. Analyze the following React/TypeScript code focusing specifically on:

1. **Web Accessibility (WCAG 2.1/2.2)**: 
   - ARIA attributes usage and correctness
   - Keyboard navigation support
   - Screen reader compatibility
   - Color contrast and visual accessibility
   - Focus management and tab order
   - Semantic HTML structure

2. **Semantic Web Standards**:
   - Proper HTML5 semantic elements usage
   - Microdata or JSON-LD structured data
   - Meta tags and SEO optimization
   - Progressive enhancement principles

3. **React Accessibility Best Practices**:
   - Proper use of React Aria hooks
   - Accessible form controls and validation
   - Error message accessibility
   - Component accessibility patterns

4. **Performance & UX for Accessibility**:
   - Loading states and skeleton screens
   - Error boundaries and fallbacks
   - Responsive design considerations
   - Animation and motion preferences`;

    const suggestionsSection = includeSuggestions
      ? `
5. **Specific Improvement Recommendations**: 
   - Concrete code examples for fixes
   - Alternative accessible implementations
   - Testing strategies for accessibility`
      : "";

    // Escape backticks in content to prevent markdown code block conflicts
    const escapedContent = this.escapeCodeBlockDelimiters(content);

    return `${basePrompt}${suggestionsSection}

File: ${filePath}

\`\`\`typescript
${escapedContent}
\`\`\`

Please provide a detailed accessibility-focused code review with specific examples and actionable recommendations. Focus on practical, implementable solutions that improve the user experience for all users, including those with disabilities.`;
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

    // Parse structured sections for accessibility-focused analysis
    let securityIssues: string[] = [];
    let performanceIssues: string[] = [];
    let architectureIssues: string[] = [];
    let logicIssues: string[] = [];
    let suggestions: string[] = [];

    if (analysisContent) {
      // Parse accessibility-specific sections
      const sections = analysisContent.split(/\*\*(.*?)\*\*/g);
      for (let i = 1; i < sections.length; i += 2) {
        const sectionName = sections[i]?.toLowerCase() || "";
        const sectionContent = sections[i + 1] || "";

        if (
          sectionName.includes("accessibility") ||
          sectionName.includes("wcag")
        ) {
          securityIssues.push(sectionContent.trim()); // Use securityIssues for accessibility issues
        } else if (
          sectionName.includes("semantic") ||
          sectionName.includes("seo")
        ) {
          performanceIssues.push(sectionContent.trim()); // Use performanceIssues for semantic/SEO issues
        } else if (
          sectionName.includes("react") ||
          sectionName.includes("component")
        ) {
          architectureIssues.push(sectionContent.trim()); // Use architectureIssues for React patterns
        } else if (
          sectionName.includes("performance") ||
          sectionName.includes("ux")
        ) {
          logicIssues.push(sectionContent.trim()); // Use logicIssues for UX/performance issues
        } else if (
          sectionName.includes("recommendation") ||
          sectionName.includes("improvement")
        ) {
          suggestions.push(sectionContent.trim());
        }
      }
    }

    return {
      context: analysisContent,
      securityIssues, // Accessibility issues
      performanceIssues, // Semantic/SEO issues
      architectureIssues, // React patterns
      logicIssues, // UX/Performance issues
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
