#!/usr/bin/env node
import { Command } from "commander";
import { intro, outro, spinner } from "@clack/prompts";
import { startServer } from "./server.js";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

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
    await startServer(); // This will start Fastify and open the browser
  });

program.parse();
