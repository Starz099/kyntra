#!/usr/bin/env node
import { Command } from "commander";
import { intro, spinner } from "@clack/prompts";
import {
  clearGraphCache,
  deleteGraphCache,
  getGraphCacheFilePath,
  graphCacheSize,
  listGraphCache,
} from "./cache-store.js";
import {
  clearStoredApiKey,
  getApiKeyFilePath,
  getStoredApiKey,
  maskApiKey,
  setStoredApiKey,
} from "./api-key-store.js";
import { commitCommandAction } from "./commands/commit.js";

const program = new Command();
// If the user didn't type a command (e.g., just 'kyntra')
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0); // Force a clean exit
}

program
  .name("kyntra")
  .description("Visualize your codebase in 4D")
  .version("1.0.0");

// Run Server
program
  .command("run")
  .description("Launch the Kyntra visualizer")
  .action(async () => {
    intro("Launching Kyntra ...");
    const { startServer } = await import("./server.js");
    await startServer(); // This will start Fastify and open the browser
  });

program
  .command("cache:list")
  .description("List persisted AI graph cache entries")
  .action(async () => {
    const s = spinner();
    s.start("Reading cache entries...");

    const entries = listGraphCache();
    s.stop(`Cache entries: ${graphCacheSize()}`);
    console.log(`Cache file: ${getGraphCacheFilePath()}`);
    if (!entries.length) {
      console.log("(empty)");
      return;
    }

    entries.forEach((entry) => {
      console.log(
        `${entry.key} (created: ${new Date(entry.createdAt).toISOString()})`,
      );
    });
  });

program
  .command("cache:clear")
  .description("Clear all persisted AI graph cache entries")
  .action(async () => {
    const s = spinner();
    s.start("Clearing cache...");
    const deleted = clearGraphCache();
    s.stop(`Cleared ${deleted} cache entr${deleted === 1 ? "y" : "ies"}.`);
  });

program
  .command("cache:delete")
  .description("Delete one persisted AI graph cache entry by key")
  .argument("<key>", "Cache key to delete (typically the git root path)")
  .action(async (key: string) => {
    const s = spinner();
    s.start(`Deleting cache entry '${key}'...`);

    const deleted = deleteGraphCache(key);
    if (deleted) {
      s.stop(`Deleted cache entry: ${key}`);
    } else {
      s.stop(`No cache entry found for key: ${key}`);
    }
  });

program
  .command("api-key:set")
  .description("Set and persist Gemini API key")
  .argument("<key>", "Gemini API key")
  .action((key: string) => {
    const s = spinner();
    s.start("Saving API key...");

    try {
      setStoredApiKey(key);
      s.stop("API key saved.");
      console.log(`Stored in: ${getApiKeyFilePath()}`);
      console.log(`Key: ${maskApiKey(key)}`);
    } catch (error) {
      s.stop("Failed to save API key.");
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exitCode = 1;
    }
  });

program
  .command("api-key:show")
  .description("Show persisted Gemini API key (masked)")
  .action(() => {
    const key = getStoredApiKey();
    if (!key) {
      console.log("No API key stored.");
      console.log(`Expected file: ${getApiKeyFilePath()}`);
      return;
    }

    console.log(`Stored in: ${getApiKeyFilePath()}`);
    console.log(`Key: ${maskApiKey(key)}`);
  });

program
  .command("api-key:clear")
  .description("Delete persisted Gemini API key")
  .action(() => {
    const deleted = clearStoredApiKey();
    if (deleted) {
      console.log("Stored API key deleted.");
    } else {
      console.log("No stored API key found.");
    }

    console.log(`Key file: ${getApiKeyFilePath()}`);
  });

program
  .command("commit")
  .description("Suggest a commit message for staged changes and commit")
  .action(commitCommandAction);

program.parse();
