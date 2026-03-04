import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

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
  return execFileSync("git", ["diff", "--cached", "--no-color"], {
    cwd: gitRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  }).trim();
}

export function getStagedFiles(gitRoot: string): string[] {
  const output = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: gitRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });

  return output
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

export function commitStagedChanges(gitRoot: string, message: string): void {
  execFileSync("git", ["commit", "-m", message], {
    cwd: gitRoot,
    stdio: "inherit",
  });
}
