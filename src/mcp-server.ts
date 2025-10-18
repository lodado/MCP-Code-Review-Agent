#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getDiff } from "./getDiff.js";
import { reviewDiffWithCodex } from "./codexReview.js";
import { ReviewResponse } from "./types.js";

const server = new Server(
  {
    name: "codex-reviewer",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 도구 목록 정의
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "review_diff",
        description: "Review code changes using Codex CLI",
        inputSchema: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["staged", "last", "file"],
              description:
                "Review mode: staged changes, last commit, or specific file",
            },
            filePath: {
              type: "string",
              description: "File path (required when mode is 'file')",
            },
            customPrompt: {
              type: "string",
              description: "Custom review prompt (optional)",
            },
          },
          required: ["mode"],
        },
      },
    ],
  };
});

// 도구 실행 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "review_diff") {
    try {
      const { mode, filePath, customPrompt } = args as {
        mode: "staged" | "last" | "file";
        filePath?: string;
        customPrompt?: string;
      };

      // Diff 모드 설정
      let diffMode:
        | { kind: "staged" }
        | { kind: "last" }
        | { kind: "file"; path: string };
      if (mode === "staged") {
        diffMode = { kind: "staged" };
      } else if (mode === "last") {
        diffMode = { kind: "last" };
      } else if (mode === "file" && filePath) {
        diffMode = { kind: "file", path: filePath };
      } else {
        throw new Error("Invalid mode or missing filePath for file mode");
      }

      // Diff 추출
      const diff = getDiff(diffMode);
      if (!diff.trim()) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                summary: "No changes detected.",
                points: [],
              }),
            },
          ],
        };
      }

      // Codex 리뷰 실행
      const reviewResult = await reviewDiffWithCodex(diff, customPrompt);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(reviewResult, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              summary: `Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              points: [],
            }),
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Codex Reviewer MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
