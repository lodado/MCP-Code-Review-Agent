import { execFileSync } from "child_process";
import { GitClient, GitStatus, ReviewType } from "../../domain/ports.js";

export class NodeGitClient implements GitClient {
  constructor(private repoPath: string) {}

  async status(repoPath: string): Promise<GitStatus> {
    try {
      // Get current branch
      const branch = execFileSync("git", ["branch", "--show-current"], {
        cwd: repoPath,
        encoding: "utf8",
      }).trim();

      // Get ahead/behind info
      let ahead = 0;
      let behind = 0;
      try {
        const ab = execFileSync(
          "git",
          ["rev-list", "--left-right", "--count", "HEAD@{upstream}...HEAD"],
          {
            cwd: repoPath,
            encoding: "utf8",
          }
        ).trim();
        const [b, a] = ab.split("\t").map(Number);
        behind = b || 0;
        ahead = a || 0;
      } catch {
        // No upstream branch
      }

      // Get porcelain status
      const porcelain = execFileSync("git", ["status", "--porcelain"], {
        cwd: repoPath,
        encoding: "utf8",
      });

      const staged: string[] = [];
      const modified: string[] = [];
      const untracked: string[] = [];
      const deleted: string[] = [];

      const lines = porcelain.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        const status = line.slice(0, 2);
        const path = line.slice(3);

        // Parse status codes
        const [stagedStatus, workingStatus] = status.split("");

        // Staged files
        if (stagedStatus && "AMR".includes(stagedStatus)) {
          staged.push(path);
        }

        // Modified files
        if (workingStatus === "M") {
          modified.push(path);
        }

        // Untracked files
        if (stagedStatus === "?" && workingStatus === "?") {
          untracked.push(path);
        }

        // Deleted files
        if (stagedStatus === "D" || workingStatus === "D") {
          deleted.push(path);
        }
      }

      return {
        branch,
        ahead,
        behind,
        staged,
        modified,
        untracked,
        deleted,
      };
    } catch (error) {
      throw new Error(
        `Git command execution failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async filesForReview(repoPath: string, type: ReviewType): Promise<string[]> {
    const gitStatus = await this.status(repoPath);

    let files: string[] = [];
    switch (type) {
      case "staged":
        files = gitStatus.staged;
        break;
      case "modified":
        files = [...gitStatus.staged, ...gitStatus.modified];
        break;
      case "full":
        files = [
          ...gitStatus.staged,
          ...gitStatus.modified,
          ...gitStatus.untracked,
        ];
        break;
      default:
        throw new Error(`Unknown review type: ${type}`);
    }

    // Filter TypeScript files (case-insensitive) and remove duplicates
    const tsFiles = files.filter((file: string) => /\.(ts|tsx)$/i.test(file));

    // Remove duplicates and normalize paths
    const uniqueFiles = Array.from(
      new Set(tsFiles.map((file) => file.toLowerCase()))
    );

    return uniqueFiles;
  }
}
