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

export function getCurrentBranchName(gitRoot: string): string {
  return runGit(gitRoot, ["branch", "--show-current"]).trim();
}

export function getLocalBranchNames(gitRoot: string): string[] {
  const output = runGit(gitRoot, [
    "branch",
    "--format=%(refname:short)",
  ]).trim();

  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function branchExists(gitRoot: string, branchName: string): boolean {
  try {
    const resolved = runGit(gitRoot, [
      "rev-parse",
      "--verify",
      "--quiet",
      `${branchName}^{commit}`,
    ]).trim();
    return Boolean(resolved);
  } catch {
    return false;
  }
}

export function isValidBranchName(
  gitRoot: string,
  branchName: string,
): boolean {
  try {
    runGit(gitRoot, ["check-ref-format", "--branch", branchName]);
    return true;
  } catch {
    return false;
  }
}

export function getAheadBehindCounts(
  gitRoot: string,
  baseBranch: string,
): { ahead: number; behind: number } {
  const output = runGit(gitRoot, [
    "rev-list",
    "--left-right",
    "--count",
    `${baseBranch}...HEAD`,
  ]).trim();

  const [behindRaw = "0", aheadRaw = "0"] = output.split(/\s+/);
  const behind = Number.parseInt(behindRaw, 10) || 0;
  const ahead = Number.parseInt(aheadRaw, 10) || 0;

  return { ahead, behind };
}

export function getCommitMessagesSince(
  gitRoot: string,
  baseBranch: string,
  maxCount = 20,
  maxChars = 2500,
): string {
  const output = runGit(gitRoot, [
    "log",
    `${baseBranch}..HEAD`,
    "--no-merges",
    `--max-count=${maxCount}`,
    "--format=%s",
  ]).trim();

  if (!output) {
    return "No unique commits found.";
  }

  if (output.length <= maxChars) {
    return output;
  }

  return `${output.slice(0, maxChars)}\n...`;
}

export function buildRepoConventionsContext(
  gitRoot: string,
  maxBranchExamples = 20,
  maxCommitExamples = 20,
  maxChars = 3500,
): string {
  const branchNames = getLocalBranchNames(gitRoot);
  const branchExamples = branchNames.slice(0, maxBranchExamples);

  const prefixCounts = new Map<string, number>();
  for (const branchName of branchNames) {
    const [firstSegment] = branchName.split("/");
    const prefix = branchName.includes("/")
      ? (firstSegment ?? "(no-prefix)")
      : "(no-prefix)";
    prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
  }

  const sortedPrefixes = Array.from(prefixCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([prefix, count]) => `- ${prefix}: ${count}`)
    .join("\n");

  const recentSubjectsRaw = runGit(gitRoot, [
    "log",
    "--no-merges",
    `--max-count=${maxCommitExamples}`,
    "--format=%s",
  ]).trim();

  const recentSubjects = recentSubjectsRaw
    ? recentSubjectsRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  const commitTypeCounts = new Map<string, number>();
  for (const subject of recentSubjects) {
    const match = subject.match(/^([a-z]+)(\([^)]+\))?:\s/);
    if (!match) {
      continue;
    }
    const type = match[1] || "<no-type>";
    commitTypeCounts.set(type, (commitTypeCounts.get(type) ?? 0) + 1);
  }

  const sortedCommitTypes = Array.from(commitTypeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([type, count]) => `- ${type}: ${count}`)
    .join("\n");

  const result = [
    "Branch prefixes used in repo:",
    sortedPrefixes || "- (none)",
    "",
    "Example existing branch names:",
    branchExamples.length
      ? branchExamples.map((name) => `- ${name}`).join("\n")
      : "- (none)",
    "",
    "Recent commit type frequency:",
    sortedCommitTypes || "- (no conventional type pattern detected)",
    "",
    "Recent commit subjects:",
    recentSubjects.length
      ? recentSubjects
          .slice(0, maxCommitExamples)
          .map((s) => `- ${s}`)
          .join("\n")
      : "- (none)",
  ].join("\n");

  if (result.length <= maxChars) {
    return result;
  }

  return `${result.slice(0, maxChars)}\n...`;
}

export function buildBranchChangeSummary(
  gitRoot: string,
  baseBranch: string,
): string {
  const changedFiles = runGit(gitRoot, [
    "diff",
    "--name-only",
    `${baseBranch}...HEAD`,
  ])
    .trim()
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);

  if (!changedFiles.length) {
    return `No file changes found between ${baseBranch} and HEAD.`;
  }

  const nameStatus = runGit(gitRoot, [
    "diff",
    "--name-status",
    `${baseBranch}...HEAD`,
  ]).trim();

  const numStat = runGit(gitRoot, [
    "diff",
    "--numstat",
    `${baseBranch}...HEAD`,
  ]).trim();

  const fileList = changedFiles.map((file) => `- ${file}`).join("\n");
  const statusBlock = nameStatus ? `\n\nStatuses:\n${nameStatus}` : "";
  const numStatBlock = numStat ? `\n\nLine stats:\n${numStat}` : "";

  return `Changed files (${changedFiles.length}) vs ${baseBranch}:\n${fileList}${statusBlock}${numStatBlock}`;
}

export function buildBranchDiffSnippets(
  gitRoot: string,
  baseBranch: string,
  perFileMaxLines = 30,
  totalMaxChars = 3500,
): string {
  try {
    const files = runGit(gitRoot, [
      "diff",
      "--name-only",
      `${baseBranch}...HEAD`,
    ])
      .trim()
      .split("\n")
      .map((file) => file.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (!files.length) {
      return "";
    }

    const parts: string[] = [];
    let remaining = totalMaxChars;

    for (const file of files) {
      const output = runGit(
        gitRoot,
        [
          "diff",
          "--no-color",
          "--unified=0",
          `${baseBranch}...HEAD`,
          "--",
          file,
        ],
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

    return [`Context snippets (truncated):`, ...parts].join("\n");
  } catch {
    return "";
  }
}

export function renameCurrentBranch(
  gitRoot: string,
  newBranchName: string,
): void {
  execFileSync("git", ["branch", "-m", newBranchName], {
    cwd: gitRoot,
    stdio: "inherit",
  });
}
