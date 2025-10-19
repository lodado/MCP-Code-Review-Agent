import { FileProcessor, ReviewedFile } from "../../domain/ports.js";

export class ConcurrentFileProcessor implements FileProcessor {
  async processFiles(
    files: string[],
    processor: (filePath: string) => Promise<ReviewedFile>,
    concurrencyLimit: number
  ): Promise<ReviewedFile[]> {
    const promises = files.map((filePath: string) =>
      processor(filePath).catch((err) => {
        throw new Error(`Failed processing ${filePath}: ${err.message}`, {
          cause: err,
        });
      })
    );

    return Promise.all(promises);
  }
}
