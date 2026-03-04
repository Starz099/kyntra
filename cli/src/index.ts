#!/usr/bin/env node
import { Command } from "commander";
import { intro, outro, spinner } from "@clack/prompts";
import path from "path";
import dotenv from "dotenv";
import {
  clearGraphCache,
  deleteGraphCache,
  getGraphCacheFilePath,
  graphCacheSize,
  listGraphCache,
} from "./cache-store.js";
dotenv.config();

const API_BASE_URL = "http://localhost:3000";

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

// Command 1: Setup
program
  .command("init")
  .description("Initialize Kyntra in the current directory")
  .action(async () => {
    intro("Initializing Kyntra...");
    const s = spinner();
    s.start("Creating configuration...");
    // Add logic to create a .kyntrarc or local db here
    s.stop("Kyntra initialized successfully!");
    outro("Ready to soar. Run `kyntra sky` to visualize.");
  });

// Command 2: Run Server
program
  .command("sky")
  .description("Launch the Kyntra visualizer")
  .action(async () => {
    intro("Launching Kyntra Sky...");
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

program.parse();
