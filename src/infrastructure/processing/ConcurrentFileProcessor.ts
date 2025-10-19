import pLimit from "p-limit";
import { FileProcessor, ReviewedFile } from "../../domain/ports.js";

export class ConcurrentFileProcessor implements FileProcessor {
  async processFiles(
    files: string[],
    processor: (filePath: string) => Promise<ReviewedFile>,
    concurrencyLimit: number
  ): Promise<ReviewedFile[]> {
    // Validate and clamp concurrency limit for safety
    const max = Math.max(1, Math.min(64, Math.floor(concurrencyLimit || 1)));
    const limit = pLimit(max);

    const promises = files.map((filePath: string) =>
      limit(() =>
        processor(filePath).catch((err) => {
          throw new Error(`Failed processing ${filePath}: ${err.message}`, {
            cause: err,
          });
        })
      )
    );

    return Promise.all(promises);
  }
}
