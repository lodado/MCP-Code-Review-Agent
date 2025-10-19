import { CodeAnalysisStrategy } from "./CodeAnalysisStrategy";
import { CodexAnalysisStrategy } from "./CodexAnalysisStrategy";
import { TypeScriptStaticAnalysisStrategy } from "./TypeScriptStaticAnalysisStrategy";
import { WebAccessibilityAnalysisStrategy } from "./WebAccessibilityAnalysisStrategy";
import { ToxicArchitectAnalysisStrategy } from "./ToxicArchitectAnalysisStrategy";
import { AIClient } from "../domain/ports";

export type AnalysisType = "codex" | "static" | "hybrid" | "accessibility" | "toxic-architect";

export class AnalysisStrategyFactory {
  static createStrategy(type: AnalysisType, aiClient?: AIClient): CodeAnalysisStrategy {
    switch (type) {
      case "codex":
        if (!aiClient) {
          throw new Error("AIClient is required for Codex analysis");
        }
        return new CodexAnalysisStrategy(aiClient);
      case "static":
        return new TypeScriptStaticAnalysisStrategy();
      case "hybrid":
        // For now, return Codex as hybrid. Can be extended to combine both strategies
        if (!aiClient) {
          throw new Error("AIClient is required for hybrid analysis");
        }
        return new CodexAnalysisStrategy(aiClient);
      case "accessibility":
        if (!aiClient) {
          throw new Error("AIClient is required for accessibility analysis");
        }
        return new WebAccessibilityAnalysisStrategy(aiClient);
      case "toxic-architect":
        if (!aiClient) {
          throw new Error("AIClient is required for toxic-architect analysis");
        }
        return new ToxicArchitectAnalysisStrategy(aiClient);
      default:
        throw new Error(`Unknown analysis type: ${type}`);
    }
  }

  static getAvailableStrategies(): AnalysisType[] {
    return ["codex", "static", "hybrid", "accessibility", "toxic-architect"];
  }
}
