import { readFileSync, existsSync, statSync, realpathSync } from "fs";
import { FileSystem, FileStats } from "../../domain/ports.js";

export class NodeFileSystem implements FileSystem {
  async read(path: string): Promise<string> {
    try {
      return readFileSync(path, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to read file ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async exists(path: string): Promise<boolean> {
    return existsSync(path);
  }

  async stat(path: string): Promise<FileStats> {
    try {
      const stats = statSync(path);
      return {
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      throw new Error(
        `Failed to stat file ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async realPath(path: string): Promise<string> {
    try {
      return realpathSync(path);
    } catch (error) {
      throw new Error(
        `Failed to resolve real path for ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
