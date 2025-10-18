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

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Codex CLI returns different format, convert to our schema
      if (parsed.findings !== undefined) {
        const points = (parsed.findings || []).map((finding: any) => ({
          file: finding.file || "unknown",
          line: finding.line,
          severity: finding.severity || "info",
          title: finding.title || "Code review finding",
          message: finding.message || finding.description || "",
          suggestion: finding.suggestion || finding.recommendation || "",
        }));

        // Add notes as info points
        if (parsed.notes && Array.isArray(parsed.notes)) {
          parsed.notes.forEach((note: string) => {
            points.push({
              file: "general",
              severity: "info",
              title: "Review Note",
              message: note,
              suggestion: "",
            });
          });
        }

        return {
          summary: parsed.summary || "Code review completed",
          points: points,
        };
      }

      // Try to parse as our expected format
      const validated = ReviewResponseSchema.parse(parsed);
      return validated;
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      return {
        summary: `Codex response: ${jsonMatch[0].substring(0, 200)}...`,
        points: [],
      };
    }
  } catch (error) {
    console.error("Codex CLI error:", error);
    return {
      summary:
        "Failed to get review from Codex CLI. Make sure @openai/codex is installed globally.",
      points: [],
    };
  }
}
