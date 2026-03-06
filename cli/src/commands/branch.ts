import { cancel, isCancel, select, spinner, text } from "@clack/prompts";
import { suggestBranchName } from "../ai-service.js";
import {
  branchExists,
  buildBranchChangeSummary,
  buildBranchDiffSnippets,
  buildRepoConventionsContext,
  findGitRoot,
  getAheadBehindCounts,
  getCommitMessagesSince,
  getCurrentBranchName,
  getLocalBranchNames,
  isValidBranchName,
  renameCurrentBranch,
} from "../git.js";

export async function branchCommandAction(baseBranchArg?: string) {
  const gitRoot = findGitRoot(process.cwd());

  if (!gitRoot) {
    console.error("No Git repository found from current directory.");
    process.exitCode = 1;
    return;
  }

  let baseBranch = baseBranchArg?.trim() ?? "";

  if (!baseBranch) {
    const baseInput = await text({
      message: "Compare current branch against which base branch?",
      placeholder: "main",
      validate(value) {
        if (!value || !value.trim()) {
          return "Base branch name is required.";
        }
      },
    });

    if (isCancel(baseInput)) {
      cancel("Branch suggestion cancelled.");
      return;
    }

    baseBranch = baseInput.trim();
  }

  if (!branchExists(gitRoot, baseBranch)) {
    console.error(`Base branch '${baseBranch}' does not exist.`);
    process.exitCode = 1;
    return;
  }

  const currentBranch = getCurrentBranchName(gitRoot);
  if (!currentBranch) {
    console.error(
      "Could not determine current branch (detached HEAD). Checkout a branch and try again.",
    );
    process.exitCode = 1;
    return;
  }

  const { ahead, behind } = getAheadBehindCounts(gitRoot, baseBranch);
  if (ahead <= 0) {
    console.log(
      `Current branch '${currentBranch}' is not ahead of '${baseBranch}' (ahead: ${ahead}, behind: ${behind}). No branch suggestion generated.`,
    );
    return;
  }

  const commitMessages = getCommitMessagesSince(gitRoot, baseBranch, 20, 2500);
  const diffSummary = buildBranchChangeSummary(gitRoot, baseBranch);
  const diffSnippets = buildBranchDiffSnippets(gitRoot, baseBranch, 30, 3000);
  const existingBranchNames = getLocalBranchNames(gitRoot);
  const repoConventions = buildRepoConventionsContext(gitRoot, 25, 25, 3000);

  const s = spinner();
  s.start(`Generating branch name suggestion from '${baseBranch}' diff...`);

  let suggestion = "";
  try {
    suggestion = await suggestBranchName({
      baseBranch,
      currentBranch,
      existingBranchNames,
      aheadCount: ahead,
      commitMessages,
      diffSummary,
      diffSnippets,
      repoConventions,
    });
    s.stop("Branch name suggestion ready.");
  } catch (error) {
    s.stop("Failed to generate branch name suggestion.");
    console.error(error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
    return;
  }

  console.log(`\nSuggested branch name:\n${suggestion}\n`);

  const action = await select({
    message: "Choose what to do",
    options: [
      { value: "use", label: "Use this" },
      { value: "edit", label: "Edit" },
      { value: "cancel", label: "Cancel" },
    ],
  });

  if (isCancel(action) || action === "cancel") {
    cancel("Branch rename cancelled.");
    return;
  }

  let finalBranchName = suggestion;

  if (action === "edit") {
    const edited = await text({
      message: "Edit branch name",
      initialValue: suggestion,
      validate(value) {
        const name = value?.trim() ?? "";
        if (!name) {
          return "Branch name cannot be empty.";
        }
        if (!isValidBranchName(gitRoot, name)) {
          return "Invalid git branch name.";
        }
      },
    });

    if (isCancel(edited)) {
      cancel("Branch rename cancelled.");
      return;
    }

    finalBranchName = edited.trim();
  }

  if (!isValidBranchName(gitRoot, finalBranchName)) {
    console.error(`Invalid git branch name: '${finalBranchName}'`);
    process.exitCode = 1;
    return;
  }

  if (
    finalBranchName !== currentBranch &&
    branchExists(gitRoot, finalBranchName)
  ) {
    console.error(`Branch '${finalBranchName}' already exists.`);
    process.exitCode = 1;
    return;
  }

  if (finalBranchName === currentBranch) {
    console.log(`Current branch is already named '${currentBranch}'.`);
    return;
  }

  try {
    renameCurrentBranch(gitRoot, finalBranchName);
    console.log(`Renamed branch '${currentBranch}' -> '${finalBranchName}'.`);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Failed to rename branch",
    );
    process.exitCode = 1;
  }
}
