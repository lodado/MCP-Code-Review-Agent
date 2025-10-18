import { execSync } from "node:child_process";
import fs from "node:fs";

export type DiffMode =
  | { kind: "staged" }
  | { kind: "last" }
  | { kind: "file"; path: string };

export function getDiff(mode: DiffMode): string {
  try {
    if (mode.kind === "staged") {
      return execSync("git diff --staged", { encoding: "utf-8", stdio: "pipe" });
    }
    if (mode.kind === "last") {
      return execSync("git diff HEAD", { encoding: "utf-8", stdio: "pipe" });
    }
    if (mode.kind === "file") {
      if (!fs.existsSync(mode.path)) return "";
      return execSync(`git diff -- ${JSON.stringify(mode.path)}`, {
        encoding: "utf-8",
        stdio: "pipe",
      });
    }
    return "";
  } catch {
    return "";
  }
}
