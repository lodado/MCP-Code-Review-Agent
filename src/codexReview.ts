import { execSync } from "node:child_process";
import { ReviewResponseSchema, type ReviewResponse } from "./types.js";

export async function reviewDiffWithCodex(
  diffText: string,
  prompt?: string
): Promise<ReviewResponse> {
  if (!diffText || diffText.trim().length === 0) {
    return { summary: "No changes detected.", points: [] };
  }

  const reviewPrompt =
    prompt ||
    `
Review the following code changes and provide structured feedback in JSON format:

\`\`\`diff
${diffText}
\`\`\`

Return a JSON object with this structure:
{
  "summary": "Brief summary of the review",
  "points": [
    {
      "file": "filename",
      "line": 42,
      "severity": "info|minor|major|critical",
      "title": "Issue title",
      "message": "Detailed description",
      "suggestion": "How to fix it"
    }
  ]
}
`;

  try {
    // Use Codex CLI to review the diff
    const result = execSync(`codex exec "${reviewPrompt}"`, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 60000, // 60초 타임아웃
    });

    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        summary: "Codex response did not contain valid JSON",
        points: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = ReviewResponseSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error("Codex CLI error:", error);
    return {
      summary:
        "Failed to get review from Codex CLI. Make sure @openai/codex is installed globally.",
      points: [],
    };
  }
}
