import { execSync } from "child_process";
import { AIClient } from "../../domain/ports.js";

export class CodexClient implements AIClient {
  constructor() {
    // Set environment variable to skip git repo check
  }

  async analyze(prompt: string): Promise<string> {
    try {
      const output = execSync(
        `codex exec --sandbox workspace-write --skip-git-repo-check`,
        {
          input: prompt,
          cwd: process.cwd(),
          encoding: "utf8",
          timeout: 1200000, // 2 minute timeout
          maxBuffer: 1024 * 1024, // 1MB buffer
        }
      );

      return output.trim();
    } catch (error) {
      console.error("Codex execution error:", error);
      throw new Error(
        `Codex analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export class MockAIClient implements AIClient {
  async analyze(prompt: string): Promise<string> {
    // Mock implementation for testing
    return `Mock analysis for prompt: ${prompt.substring(0, 100)}...`;
  }
}
