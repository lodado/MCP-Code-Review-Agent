import { Reporter, CodeReviewResult } from "../domain/ports.js";

export class JsonReporter implements Reporter {
  render(result: CodeReviewResult): string {
    return JSON.stringify(result, null, 2);
  }
}
