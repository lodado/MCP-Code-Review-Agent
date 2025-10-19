import { Codex } from "@openai/codex-sdk";
import { AIClient } from "../../domain/ports.js";

export class CodexClient implements AIClient {
  private codex: Codex;

  constructor() {
    this.codex = new Codex();
  }

  async analyze(prompt: string): Promise<string> {
    try {
      const thread = this.codex.startThread();
      const turn = await thread.run(prompt);
      return turn.finalResponse || "";
    } catch (error) {
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
