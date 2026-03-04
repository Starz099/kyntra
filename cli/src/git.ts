import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

function runGit(gitRoot: string, args: string[], maxBuffer = 1024 * 1024) {
  return execFileSync("git", args, {
    cwd: gitRoot,
    encoding: "utf8",
    maxBuffer,
  });
}

export function findGitRoot(startDir: string): string | null {
  let currentDir = path.resolve(startDir);

  while (currentDir !== path.parse(currentDir).root) {
    const gitPath = path.join(currentDir, ".git");
    if (fs.existsSync(gitPath) && fs.statSync(gitPath).isDirectory()) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

export function getStagedDiff(gitRoot: string): string {
  return runGit(
    gitRoot,
    ["diff", "--cached", "--no-color"],
    10 * 1024 * 1024,
  ).trim();
}

export function getStagedFiles(gitRoot: string): string[] {
  const output = runGit(gitRoot, ["diff", "--cached", "--name-only"]);

  return output
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

export function buildStagedChangeSummary(
  gitRoot: string,
  files: string[],
): string {
  if (!files.length) {
    return "No staged files.";
  }

  const nameStatus = runGit(gitRoot, [
    "diff",
    "--cached",
    "--name-status",
  ]).trim();
  const numStat = runGit(gitRoot, ["diff", "--cached", "--numstat"]).trim();

  const fileList = files.map((file) => `- ${file}`).join("\n");
  const statusBlock = nameStatus ? `\n\nStatuses:\n${nameStatus}` : "";
  const numStatBlock = numStat ? `\n\nLine stats:\n${numStat}` : "";

  return `Staged files (${files.length}):\n${fileList}${statusBlock}${numStatBlock}`;
}

export function buildStagedDiffSnippets(
  gitRoot: string,
  files: string[],
  perFileMaxLines = 30,
  totalMaxChars = 3500,
): string {
  try {
    const targetFiles = files.slice(0, 5);
    const parts: string[] = [];
    let remaining = totalMaxChars;

    for (const file of targetFiles) {
      const output = runGit(
        gitRoot,
        ["diff", "--cached", "--no-color", "--unified=0", "--", file],
        4 * 1024 * 1024,
      ).trim();

      if (!output) {
        continue;
      }

      const lines = output.split("\n").filter(Boolean);
      const picked: string[] = [];
      let count = 0;

      for (const line of lines) {
        const isHunk = line.startsWith("@@");
        const isChange =
          (line.startsWith("+") || line.startsWith("-")) &&
          !line.startsWith("+++") &&
          !line.startsWith("---");

        if (isHunk || isChange) {
          picked.push(line);
          count += 1;
          if (count >= perFileMaxLines) {
            break;
          }
        }
      }

      if (!picked.length) {
        continue;
      }

      const block = [`# ${file}`, ...picked].join("\n");
      if (block.length <= remaining) {
        parts.push(block);
        remaining -= block.length;
      } else {
        parts.push(block.slice(0, Math.max(0, remaining)));
        remaining = 0;
      }

      if (remaining <= 0) {
        break;
      }
    }

    if (!parts.length) {
      return "";
    }

    return ["Context snippets (truncated):", ...parts].join("\n");
  } catch {
    return "";
  }
}

export function commitStagedChanges(gitRoot: string, message: string): void {
  execFileSync("git", ["commit", "-m", message], {
    cwd: gitRoot,
    stdio: "inherit",
  });
}
