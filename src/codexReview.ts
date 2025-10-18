import { Codex } from "@openai/codex-sdk";
import { ReviewResponseSchema, type ReviewResponse } from "./types.js";

const SYSTEM_PROMPT = `
You are a senior code reviewer. 
Return STRICTLY a JSON object with shape:
{
  "summary": string,
  "points": [
    { "file": string, "line": number?, "severity": "info"|"minor"|"major"|"critical",
      "title": string, "message": string, "suggestion": string? }
  ]
}
Guidelines:
- Review based ONLY on the provided unified diff (git-style).
- Include file paths exactly as seen in the diff headers.
- When possible, infer an approximate line for each point from the hunk.
- Prefer actionable suggestions (snippets or concrete steps).
- Be concise but specific.
`;

export async function reviewDiffWithCodex(
  diffText: string,
  apiKey?: string
): Promise<ReviewResponse> {
  if (!diffText || diffText.trim().length === 0) {
    return { summary: "No changes detected.", points: [] };
  }

  const codex = new Codex({
    apiKey: apiKey ?? process.env.OPENAI_API_KEY,
  });

  const thread = codex.startThread();

  const userPrompt = `${SYSTEM_PROMPT}

Review the following unified diff and produce JSON:
\`\`\`diff
${diffText}
\`\`\``;

  try {
    const result = await thread.run(userPrompt);

    const text = result.finalResponse;
    const match = text.match(/\{[\s\S]*\}$/m);
    const jsonStr = match ? match[0] : text;

    const parsed = JSON.parse(jsonStr);
    const validated = ReviewResponseSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error("Codex API error:", error);
    return { summary: "Failed to get review from Codex API.", points: [] };
  }
}
