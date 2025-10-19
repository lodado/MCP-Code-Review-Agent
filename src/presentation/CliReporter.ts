import { Reporter, CodeReviewResult } from "../domain/ports.js";

export class CliReporter implements Reporter {
  constructor(private useEmoji: boolean = true) {}

  render(result: CodeReviewResult): string {
    let output = result.summary + "\n\n";

    if (result.files.length > 0) {
      output += "📁 Analysis Results:\n";
      output += "--------------------------------------------------\n";

      result.files.forEach((file: any, index: number) => {
        output += `${index + 1}. ${file.path}\n`;

        if (file.status === "reviewed" && file.analysis) {
          output += `   ${this.getEmoji("🧠")} Analysis:\n`;
          output += `   ${file.analysis.context}\n`;

          if (file.analysis.suggestions.length > 0) {
            output += `   ${this.getEmoji("💡")} Suggestions:\n`;
            file.analysis.suggestions.forEach((suggestion: string) => {
              output += `   - ${suggestion}\n`;
            });
          }
        } else if (file.status === "skipped" && file.reason) {
          output += `   ${this.getEmoji("⚠️")} Skipped: ${file.reason}\n`;
        } else if (file.status === "error" && file.reason) {
          output += `   ${this.getEmoji("❌")} Error: ${file.reason}\n`;
        } else if (file.status === "inaccessible") {
          output += `   ${this.getEmoji("🔒")} Inaccessible\n`;
        }

        output += "\n";
      });
    } else {
      output += "No files to review.\n";
    }

    return output;
  }

  private getEmoji(emoji: string): string {
    return this.useEmoji ? emoji : "";
  }
}
