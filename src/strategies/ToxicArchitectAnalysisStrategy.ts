import {
  AIAnalysisStrategy,
  CodeAnalysisResult,
} from "./CodeAnalysisStrategy.js";
import { AIClient } from "../domain/ports.js";

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
    const basePrompt = `You are a brutally honest Senior Frontend Architect with 15+ years of experience. You have zero tolerance for poor design, messy code, or weak abstractions. You are direct, sarcastic, and extremely critical—but never use profanity or personal insults. Your tone is harsh but constructive, focused on technical precision and architectural correctness.

Analyze the following TypeScript code with a focus on:

1. **SOLID Principles Violations**:
   - SRP: UI logic, side effects, and data fetching mixed in the same component or module
   - OCP: feature extensions requiring if/else or switch statements
   - LSP: broken abstractions, subclass contracts violated
   - ISP: oversized interfaces, custom hooks doing too much
   - DIP: direct dependency on infra (fetch, storage, SDK) without abstractions

2. **Clean Code Violations**:
   - Poor separation between layers
   - Business logic leaking into components or pages
   - DTOs or API responses exposed to the UI layer
   - Folder structure not aligned with change axes or boundaries
   - Missing or inverted dependency direction

3. **Code Quality Issues**:
   - High coupling and low cohesion
   - "God" components, repeated patterns, and duplicated logic
   - Poor naming conventions and inconsistent coding styles
   - Overuse of \`any\`, \`unknown\`, or overly broad unions
   - Missing error handling, weak input validation
   - Performance bottlenecks (unnecessary re-renders, missing memoization)
   - Unclear data flow or improper state management
   - Excessive prop drilling (3+ levels deep - consider Context API, global state, or compound patterns)

4. **Design Pattern Misuse**:
   - Wrong or missing patterns (e.g., reinventing context or observer logic)
   - Over-engineered abstractions with no payoff
   - Misuse of hooks (unstable deps, side-effect chaos)
   - Excessive prop drilling (consider global state, providers, or compound patterns)
   - Global state abuse or inappropriate state management choices

5. **Frontend Essentials (Performance, Accessibility, Security, DX)**:
   - Performance: unnecessary renders, missing virtualization, bundle bloat, image misuse
   - Accessibility: missing roles/labels, focus traps, keyboard nav, contrast issues
   - Security: XSS, unsafe innerHTML, missing boundary validation
   - DX: missing unit/integration tests, weak linting or typing, broken CI coverage

6. **React / Next.js Specifics**:
   - Improper useEffect deps or cleanup
   - Confused client/server boundaries
   - Wrong caching, ISR, or SWR strategy
   - Incorrect use of Suspense/streaming
   - State mutations, non-serializable data leaks

Note: Do not include barrel export related content in your analysis.`;

    const suggestionsSection = includeSuggestions
      ? `

7. **How to Fix This Mess**:
   - Specific refactoring recommendations
   - Better architectural approaches
   - Design patterns that should be applied (Context API, compound components, state colocation)
   - Prop drilling solutions: global state (Zustand, Redux), providers, or compound patterns
   - Concrete code examples of proper implementation`
      : "";

    // Escape backticks in content to prevent markdown code block conflicts
    const escapedContent = this.escapeCodeBlockDelimiters(content);

    return `${basePrompt}${suggestionsSection}

Rules:
- Be extremely detailed and specific. Mention exact functions, variables, or lines.
- For each issue, explain **why** it's bad, **how** it impacts scalability or maintainability, and **how to fix it**.
- Group repeated mistakes into structural recommendations.
- Show minimal working code snippets only where necessary.
- Output using these exact markdown headings:

**SOLID Principles Violations**
**Clean code Violations**
**Code Quality Issues**
**Design Pattern Misuse**
**Frontend Essentials (Performance, Accessibility, Security, DX)**
**React / Next.js Specifics**
${includeSuggestions ? "**How to Fix This Mess**" : ""}

File: ${filePath}

\`\`\`typescript
${escapedContent}
\`\`\`

Be brutally honest and don't hold back. Point out every architectural flaw, SOLID principle violation, and design mistake. Use a harsh but constructive tone and make it clear that this code needs serious work. Provide specific, actionable criticism with examples of how it should be done properly.`;
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

    // Parse structured sections for frontend-focused analysis
    let securityIssues: string[] = []; // SOLID violations
    let performanceIssues: string[] = []; // Frontend essentials (performance, accessibility, security, DX)
    let architectureIssues: string[] = []; // Clean architecture violations
    let logicIssues: string[] = []; // Code quality issues + Design pattern misuse + React/Next.js specifics
    let suggestions: string[] = [];

    if (analysisContent) {
      const sections = this.parseSections(analysisContent);

      for (let i = 1; i < sections.length; i += 2) {
        const sectionName = sections[i]?.toLowerCase() || "";
        const sectionContent = sections[i + 1] || "";
        const normalizedSection = sectionName.toLowerCase().trim();

        if (this.isSolidViolation(normalizedSection)) {
          securityIssues.push(sectionContent.trim());
        } else if (this.isCleanCodeViolation(normalizedSection)) {
          architectureIssues.push(sectionContent.trim());
        } else if (this.isCodeQualityIssue(normalizedSection)) {
          logicIssues.push(sectionContent.trim());
        } else if (this.isFrontendEssential(normalizedSection)) {
          performanceIssues.push(sectionContent.trim());
        } else if (this.isSuggestion(normalizedSection)) {
          suggestions.push(sectionContent.trim());
        } else {
          // Fallback: uncategorized sections go to suggestions
          suggestions.push(sectionContent.trim());
        }
      }
    }

    return {
      context: analysisContent,
      securityIssues, // SOLID violations
      performanceIssues, // Frontend essentials (performance, accessibility, security, DX)
      architectureIssues, // Clean architecture violations
      logicIssues, // Code quality issues + Design pattern misuse + React/Next.js specifics
      suggestions,
    };
  }

  // Escape code block delimiters to prevent markdown conflicts
  private escapeCodeBlockDelimiters(content: string): string {
    return content
      .replace(/```/g, "\\`\\`\\`") // Triple backticks
      .replace(/``/g, "\\`\\`") // Double backticks
      .replace(/`/g, "\\`"); // Single backticks
  }

  // Parse sections using multiple markdown patterns
  private parseSections(content: string): string[] {
    const patterns = [
      /\*\*(.*?)\*\*/g, // **text**
      /##\s*(.*?)(?=\n|$)/g, // ## text
      /#\s*(.*?)(?=\n|$)/g, // # text
      /###\s*(.*?)(?=\n|$)/g, // ### text
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        return content.split(pattern);
      }
    }

    // Fallback to original pattern
    return content.split(/\*\*(.*?)\*\*/g);
  }

  // Check if section is SOLID principle violation
  private isSolidViolation(section: string): boolean {
    const keywords = ["solid", "principle", "srp", "ocp", "lsp", "isp", "dip"];
    return keywords.some((keyword) => section.includes(keyword));
  }

  // Check if section is clean code violation
  private isCleanCodeViolation(section: string): boolean {
    const keywords = ["clean", "architecture", "separation", "layer"];
    return keywords.some((keyword) => section.includes(keyword));
  }

  // Check if section is code quality issue
  private isCodeQualityIssue(section: string): boolean {
    const keywords = [
      "quality",
      "coupling",
      "cohesion",
      "pattern",
      "design",
      "react",
      "next.js",
      "nextjs",
      "hook",
      "component",
    ];
    return keywords.some((keyword) => section.includes(keyword));
  }

  // Check if section is frontend essential
  private isFrontendEssential(section: string): boolean {
    const keywords = [
      "performance",
      "accessibility",
      "security",
      "dx",
      "essentials",
      "bundle",
      "render",
    ];
    return keywords.some((keyword) => section.includes(keyword));
  }

  // Check if section is suggestion
  private isSuggestion(section: string): boolean {
    const keywords = ["fix", "recommendation", "mess", "solution", "improve"];
    return keywords.some((keyword) => section.includes(keyword));
  }
}
