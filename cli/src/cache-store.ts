import fs from "fs";
import os from "os";
import path from "path";

type GraphPayload = {
  nodes: unknown[];
  edges: unknown[];
};

type CacheEntry = {
  key: string;
  createdAt: number;
  data: GraphPayload;
};

type CacheFileShape = {
  version: 1;
  entries: CacheEntry[];
};

const graphCache = new Map<string, CacheEntry>();
const cacheDir = path.join(os.homedir(), ".kyntra");
const cacheFilePath = path.join(cacheDir, "graph-cache.json");

function loadCacheFromDisk() {
  try {
    if (!fs.existsSync(cacheFilePath)) {
      return;
    }

    const raw = fs.readFileSync(cacheFilePath, "utf-8");
    const parsed = JSON.parse(raw) as CacheFileShape;

    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) {
      return;
    }

    for (const entry of parsed.entries) {
      if (entry && typeof entry.key === "string" && entry.data) {
        graphCache.set(entry.key, entry);
      }
    }
  } catch (error) {
    console.warn("Failed to load Kyntra cache from disk:", error);
  }
}

function persistCacheToDisk() {
  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const payload: CacheFileShape = {
      version: 1,
      entries: Array.from(graphCache.values()),
    };

    fs.writeFileSync(cacheFilePath, JSON.stringify(payload, null, 2), "utf-8");
  } catch (error) {
    console.warn("Failed to persist Kyntra cache to disk:", error);
  }
}

loadCacheFromDisk();

export function getGraphCache(key: string): GraphPayload | null {
  return graphCache.get(key)?.data ?? null;
}

export function setGraphCache(key: string, data: GraphPayload): void {
  graphCache.set(key, {
    key,
    createdAt: Date.now(),
    data,
  });
  persistCacheToDisk();
}

export function deleteGraphCache(key: string): boolean {
  const deleted = graphCache.delete(key);
  if (deleted) {
    persistCacheToDisk();
  }

  return deleted;
}

export function clearGraphCache(): number {
  const removed = graphCache.size;
  graphCache.clear();
  persistCacheToDisk();
  return removed;
}

export function listGraphCache(): Array<{ key: string; createdAt: number }> {
  return Array.from(graphCache.values()).map((entry) => ({
    key: entry.key,
    createdAt: entry.createdAt,
  }));
}

export function graphCacheSize(): number {
  return graphCache.size;
}

export function getGraphCacheFilePath(): string {
  return cacheFilePath;
}
