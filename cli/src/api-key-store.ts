import fs from "fs";
import os from "os";
import path from "path";

type ApiKeyFileShape = {
  apiKey: string;
};

const configDir = path.join(os.homedir(), ".kyntra");
const apiKeyFilePath = path.join(configDir, "api-key.json");

function readApiKeyFile(): ApiKeyFileShape | null {
  try {
    if (!fs.existsSync(apiKeyFilePath)) {
      return null;
    }

    const raw = fs.readFileSync(apiKeyFilePath, "utf-8");
    const parsed = JSON.parse(raw) as
      | ApiKeyFileShape
      | { version?: number; apiKey?: string };
    const key = parsed?.apiKey;

    if (typeof key !== "string" || !key.trim()) {
      return null;
    }

    return { apiKey: key };
  } catch (error) {
    console.warn("Failed to read Kyntra API key from disk:", error);
    return null;
  }
}

export function getStoredApiKey(): string | null {
  const file = readApiKeyFile();
  return file?.apiKey ?? null;
}

export function setStoredApiKey(apiKey: string): void {
  const value = apiKey.trim();
  if (!value) {
    throw new Error("API key cannot be empty.");
  }

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const payload: ApiKeyFileShape = {
    apiKey: value,
  };

  fs.writeFileSync(apiKeyFilePath, JSON.stringify(payload, null, 2), "utf-8");
}

export function clearStoredApiKey(): boolean {
  if (!fs.existsSync(apiKeyFilePath)) {
    return false;
  }

  fs.unlinkSync(apiKeyFilePath);
  return true;
}

export function getApiKeyFilePath(): string {
  return apiKeyFilePath;
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) {
    return "*".repeat(Math.max(trimmed.length, 4));
  }

  return `${trimmed.slice(0, 4)}${"*".repeat(trimmed.length - 8)}${trimmed.slice(-4)}`;
}
