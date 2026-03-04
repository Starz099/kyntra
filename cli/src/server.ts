import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import open from "open"; // Uncomment if you want to auto-open
import { findGitRoot } from "./git.js";
import { analyzeRepoWithAI } from "./ai-service.js";
import {
  clearGraphCache,
  deleteGraphCache,
  getGraphCache,
  graphCacheSize,
  listGraphCache,
  setGraphCache,
} from "./cache-store.js";

export const startServer = async () => {
  const fastify = Fastify();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const reactDistPath = path.join(__dirname, "../../web/dist");

  await fastify.register(fastifyStatic, {
    root: reactDistPath,
    prefix: "/",
    wildcard: true,
  });

  fastify.get("/api/cache", async () => {
    return {
      size: graphCacheSize(),
      entries: listGraphCache(),
    };
  });

  fastify.delete("/api/cache", async (request, reply) => {
    const { key } = (request.query as { key?: string }) || {};

    if (key) {
      const deleted = deleteGraphCache(key);
      return {
        deleted,
        key,
      };
    }

    const removed = clearGraphCache();
    return {
      deleted: removed,
    };
  });

  fastify.get("/api/graph", async (request, reply) => {
    const gitRoot = findGitRoot(process.cwd());
    if (!gitRoot) {
      return reply.status(400).send({ error: "No Git root found" });
    }

    const shouldRefresh =
      ((request.query as { refresh?: string }) || {}).refresh === "true";

    if (!shouldRefresh) {
      const cachedGraph = getGraphCache(gitRoot);
      if (cachedGraph) {
        console.log(`Cache hit for ${gitRoot}. Returning persisted graph.`);
        return cachedGraph;
      }
    }

    // Temporary file name for this specific request
    const tempFileName = `repomix-ctx-${Date.now()}.xml`;
    const tempFilePath = path.join(gitRoot, tempFileName);

    try {
      console.log("Generating repository context via npx repomix...");

      // Execute the command: -y skips prompts, --style xml sets format, --compress uses tree-sitter
      execSync(
        `npx -y repomix --style xml --output ${tempFileName} --compress --include "src/**/*"`,
        { cwd: gitRoot, stdio: "inherit" },
      );

      if (!fs.existsSync(tempFilePath)) {
        throw new Error("Repomix failed to create context file.");
      }

      const repoContext = fs.readFileSync(tempFilePath, "utf-8");

      // LOGGING THE CONTEXT (as requested)
      console.log("--- REPOMIX CONTEXT START ---");
      console.log(repoContext);
      console.log("--- REPOMIX CONTEXT END ---");

      // CLEANUP: Delete the file as soon as it's in memory
      fs.unlinkSync(tempFilePath);
      console.log("Temporary context file deleted.");

      console.log("Sending context to Gemini 3 Flash (Thinking Mode)...");
      const aiData = await analyzeRepoWithAI(repoContext);

      // Map AI data into React Flow format
      const nodes = aiData.files.map((file: any) => ({
        id: file.path,
        type: "fileNode",
        position: { x: Math.random() * 800, y: Math.random() * 600 },
        data: {
          label: path.basename(file.path),
          fullPath: file.path,
          summary: file.summary,
          symbols: file.symbols,
        },
      }));

      const edges = aiData.files.flatMap((file: any) =>
        (file.dependencies || []).map((dep: string) => ({
          id: `e-${file.path}-${dep}`,
          source: file.path,
          target: dep,
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        })),
      );

      const graphPayload = { nodes, edges };
      setGraphCache(gitRoot, graphPayload);
      console.log(`Cache store updated for ${gitRoot}.`);

      console.log(`Graph built: ${nodes.length} nodes, ${edges.length} edges.`);
      return graphPayload;
    } catch (err) {
      // Ensure file is deleted even if the process crashes mid-way
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

      console.error("Error generating graph:", err);
      return reply.status(500).send({ error: "Failed to generate graph" });
    }
  });

  fastify.setNotFoundHandler((request, reply) => {
    return reply.sendFile("index.html");
  });

  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Kyntra running at http://localhost:3000");
    open("http://localhost:3000").catch((err) => {
      console.warn("Failed to open browser automatically:", err);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
