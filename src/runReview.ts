import "dotenv/config";
import chalk from "chalk";
import { getDiff } from "./getDiff.js";
import { reviewDiffWithCodex } from "./codexReview.js";
import { ReviewPoint } from "./types.js";
import fs from "node:fs";

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.includes("--staged")) return { kind: "staged" } as const;
  if (args.includes("--last")) return { kind: "last" } as const;
  const fileIdx = args.indexOf("--file");
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    return { kind: "file", path: args[fileIdx + 1] } as const;
  }
  return { kind: "staged" } as const;
}

function printPoints(points: ReviewPoint[]) {
  for (const p of points) {
    const sev =
      p.severity === "critical" ? chalk.redBright("[critical]") :
      p.severity === "major"    ? chalk.red("[major]") :
      p.severity === "minor"    ? chalk.yellow("[minor]") :
                                  chalk.blue("[info]");

    const loc = p.line ? `${p.file}:${p.line}` : p.file;
    console.log(`${sev} ${chalk.cyan(p.title)}  ${chalk.gray(loc)}`);
    console.log(`  ${p.message}`);
    if (p.suggestion) {
      console.log(chalk.green(`  Suggestion: ${p.suggestion}`));
    }
    console.log("");
  }
}

async function main() {
  const mode = parseArgs() as any;
  const diff = getDiff(mode);
  if (!diff.trim()) {
    console.log(chalk.gray("No diff to review."));
    return;
  }

  console.log(chalk.gray("Requesting Codex review…"));
  const res = await reviewDiffWithCodex(diff);

  if (res.summary) {
    console.log(chalk.magenta(`\nSummary: ${res.summary}\n`));
  }

  if (!res.points.length) {
    console.log(chalk.green("✅ No issues found (or unable to parse JSON)."));
  } else {
    printPoints(res.points);

    fs.mkdirSync(".codex", { recursive: true });
    fs.writeFileSync(".codex/review.json", JSON.stringify(res, null, 2), "utf-8");
    console.log(chalk.gray("Saved: .codex/review.json"));
  }

  const hasCritical = res.points.some(p => p.severity === "critical");
  if (hasCritical) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
