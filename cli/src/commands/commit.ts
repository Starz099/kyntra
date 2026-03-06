import { cancel, isCancel, select, spinner, text } from "@clack/prompts";
import {
  buildRepoConventionsContext,
  buildStagedChangeSummary,
  buildStagedDiffSnippets,
  commitStagedChanges,
  findGitRoot,
  getStagedFiles,
} from "../git.js";
import { suggestCommitMessage } from "../ai-service.js";

export async function commitCommandAction() {
  const gitRoot = findGitRoot(process.cwd());

  if (!gitRoot) {
    console.error("No Git repository found from current directory.");
    process.exitCode = 1;
    return;
  }

  const stagedFiles = getStagedFiles(gitRoot);
  if (!stagedFiles.length) {
    console.log(
      "No staged changes found. Stage files first, then run 'kyntra commit'.",
    );
    return;
  }

  const summary = buildStagedChangeSummary(gitRoot, stagedFiles);
  const snippets = buildStagedDiffSnippets(gitRoot, stagedFiles, 30, 3000);
  const repoConventions = buildRepoConventionsContext(gitRoot, 20, 20, 2500);

  const s = spinner();
  s.start("Generating commit message suggestion...");

  let suggestion = "";
  try {
    suggestion = await suggestCommitMessage({
      files: stagedFiles,
      summary,
      snippets,
      repoConventions,
    });
    s.stop("Commit message suggestion ready.");
  } catch (error) {
    s.stop("Failed to generate commit message.");
    console.error(error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
    return;
  }

  console.log(`\nSuggested message:\n${suggestion}\n`);

  const action = await select({
    message: "Choose what to do",
    options: [
      { value: "use", label: "Use this" },
      { value: "edit", label: "Edit and commit" },
      { value: "cancel", label: "Cancel" },
    ],
  });

  if (isCancel(action) || action === "cancel") {
    cancel("Commit cancelled.");
    return;
  }

  let finalMessage = suggestion;

  if (action === "edit") {
    const edited = await text({
      message: "Edit commit message",
      initialValue: suggestion,
      validate(value) {
        if (!value || !value.trim()) {
          return "Commit message cannot be empty.";
        }
      },
    });

    if (isCancel(edited)) {
      cancel("Commit cancelled.");
      return;
    }

    finalMessage = edited.trim();
  }

  try {
    commitStagedChanges(gitRoot, finalMessage);
    console.log(`Committed with message: ${finalMessage}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Failed to commit");
    process.exitCode = 1;
  }
}
