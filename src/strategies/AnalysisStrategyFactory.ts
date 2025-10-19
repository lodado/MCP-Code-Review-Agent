import { CodeAnalysisStrategy } from "./CodeAnalysisStrategy.js";
import { CodexAnalysisStrategy } from "./CodexAnalysisStrategy.js";
import { TypeScriptStaticAnalysisStrategy } from "./TypeScriptStaticAnalysisStrategy.js";
import { WebAccessibilityAnalysisStrategy } from "./WebAccessibilityAnalysisStrategy.js";
import { ToxicArchitectAnalysisStrategy } from "./ToxicArchitectAnalysisStrategy.js";

export type AnalysisType = "codex" | "static" | "hybrid" | "accessibility" | "toxic-architect";

export class AnalysisStrategyFactory {
  static createStrategy(type: AnalysisType): CodeAnalysisStrategy {
    switch (type) {
      case "codex":
        return new CodexAnalysisStrategy();
      case "static":
        return new TypeScriptStaticAnalysisStrategy();
      case "hybrid":
        // For now, return Codex as hybrid. Can be extended to combine both strategies
        return new CodexAnalysisStrategy();
      case "accessibility":
        return new WebAccessibilityAnalysisStrategy();
      case "toxic-architect":
        return new ToxicArchitectAnalysisStrategy();
      default:
        throw new Error(`Unknown analysis type: ${type}`);
    }
  }

  static getAvailableStrategies(): AnalysisType[] {
    return ["codex", "static", "hybrid", "accessibility", "toxic-architect"];
  }
}
