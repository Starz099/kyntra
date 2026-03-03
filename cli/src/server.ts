import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import open from "open";
import { findGitRoot } from "./git.js";
import { getRepoFiles } from "./scanner.js";
export const startServer = async () => {
  const fastify = Fastify();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const reactDistPath = path.join(__dirname, "../../web/dist");

  console.log("Serving React app from:", reactDistPath);
  // 1. Register static plugin with wildcard support
  await fastify.register(fastifyStatic, {
    root: reactDistPath,
    prefix: "/",
    wildcard: true, // This replaces the need for your manual '/*' route
  });

  // 2. Define API routes BEFORE the catch-all behavior
  // This ensures /api/graph isn't intercepted by the static file handler
  fastify.get("/api/graph", async () => {
    console.log("Received request for /api/graph");
    const gitRoot = findGitRoot(process.cwd()); // Just to demonstrate usage; you can remove this line

    const AllFiles: string[] = [];
    if (gitRoot) {
      console.log("Found Git root at:", gitRoot);
      AllFiles.push(...getRepoFiles(gitRoot));
      // AllFiles.forEach(file => {
      //   console.log("Repo file:", file);
      // });
    }

    return { nodes: [], edges: [], files: AllFiles }; // Placeholder response; replace with actual graph data
  });

  // 3. Handle SPA routing (redirecting 404s to index.html)
  fastify.setNotFoundHandler((request, reply) => {
    return reply.sendFile("index.html");
  });

  try {
    // Port 3000 might be busy if you're developing the web side;
    // consider using a unique port for Kyntra
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Server running at http://localhost:3000");
    await open("http://localhost:3000");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
