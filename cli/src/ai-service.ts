import { GoogleGenAI } from "@google/genai";
import { getStoredApiKey } from "./api-key-store.js";

function resolveApiKey(): string {
  const storedKey = getStoredApiKey();
  if (!storedKey) {
    throw new Error(
      "No API key configured. Use 'kyntra api-key:set <key>' or set GEMINI_API_KEY.",
    );
  }
  return storedKey;
}

function createAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: resolveApiKey(),
  });
}

// Define the response schema for our Graph
const graphSchema = {
  type: "object",
  properties: {
    files: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          summary: { type: "string" },
          symbols: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" }, // e.g., "function", "class"
              },
            },
          },
          dependencies: {
            type: "array",
            items: { type: "string" }, // Array of relative paths
          },
        },
        required: ["path", "summary", "dependencies"],
      },
    },
  },
  required: ["files"],
};

export async function analyzeRepoWithAI(repoContext: string) {
  const ai = createAIClient();
  const model = "gemini-3-flash-preview";

  const config = {
    // High reasoning is perfect for code dependency mapping
    thinkingConfig: {
      includeThoughts: true, // Optional: helpful for debugging logic
      thinkingLevel: "high",
    },
    // Enforce the JSON structure
    responseMimeType: "application/json",
    responseSchema: graphSchema,
  };

  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `Analyze this repository skeleton and map the file dependencies and return a json file:\n\n${repoContext}`,
        },
      ],
    },
  ];

  try {
    const result = await ai.models.generateContent({
      model,
      //@ts-ignore
      config,
      contents,
    });

    if (!result || !result.text) {
      throw new Error("No response from Gemini");
    }

    // In the new SDK, the JSON is returned directly in the text property
    return JSON.parse(result.text);
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
}

function sanitizeCommitMessage(message: string): string {
  return (
    message
      .replace(/^```[\s\S]*?\n/, "")
      .replace(/```$/, "")
      .replace(/^['"]+|['"]+$/g, "")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean)
      ?.trim() ?? "chore: update staged changes"
  );
}

export async function suggestCommitMessageFromDiff(stagedDiff: string) {
  const ai = createAIClient();
  const model = "gemini-2.5-flash";

  const trimmedDiff =
    stagedDiff.length > 24000
      ? `${stagedDiff.slice(0, 24000)}\n\n[diff truncated]`
      : stagedDiff;

  const result = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "You are generating a git commit message.",
              "Return exactly one concise conventional-commit style subject line.",
              "No code fences, no quotes, no body, max 72 chars.",
              "Use imperative mood and reflect the staged diff.",
              "",
              trimmedDiff,
            ].join("\n"),
          },
        ],
      },
    ],
  });

  if (!result?.text?.trim()) {
    throw new Error("No commit message suggestion returned by Gemini");
  }

  return sanitizeCommitMessage(result.text);
}
