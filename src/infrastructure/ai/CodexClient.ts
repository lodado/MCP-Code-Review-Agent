import { Codex } from "@openai/codex-sdk";
import { AIClient } from "../../domain/ports.js";

export class CodexClient implements AIClient {
  private codex: Codex;

  constructor() {
    // Codex 인스턴스 초기화
    this.codex = new Codex({
      // (선택) auth, workspace 옵션 등 필요 시 추가
    });
  }

  async analyze(prompt: string): Promise<string> {
    try {
      // Codex Thread 생성
      const thread = this.codex.startThread();

      // prompt 실행
      const turn = await thread.run(prompt, {});

      // 최종 결과 반환
      return (turn.finalResponse || "").trim();
    } catch (error) {
      console.error("Codex SDK execution error:", error);
      throw new Error(
        `Codex analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

// 테스트용 목업
export class MockAIClient implements AIClient {
  async analyze(prompt: string): Promise<string> {
    return `Mock analysis for prompt: ${prompt.substring(0, 100)}...`;
  }
}
