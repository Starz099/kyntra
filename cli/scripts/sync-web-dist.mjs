import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliRoot = path.resolve(__dirname, "..");
const webDistDir = path.resolve(cliRoot, "../web/dist");
const publicDir = path.resolve(cliRoot, "public");

if (!fs.existsSync(path.join(webDistDir, "index.html"))) {
  throw new Error(
    `Frontend build not found at ${webDistDir}. Run 'pnpm --dir ../web run build' first.`,
  );
}

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });
fs.cpSync(webDistDir, publicDir, { recursive: true });

console.log(`Synced frontend assets from ${webDistDir} -> ${publicDir}`);
