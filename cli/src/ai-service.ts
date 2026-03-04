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
  const firstLine =
    message
      .replace(/^```[\s\S]*?\n/, "")
      .replace(/```$/, "")
      .replace(/^['"]+|['"]+$/g, "")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean)
      ?.trim() ?? "chore: update staged changes";

  const normalized = firstLine.replace(/^\w+\([^)]+\):\s*/, (match) => {
    const typeOnly = match.split("(")[0];
    return `${typeOnly}: `;
  });

  return normalized.trim();
}

interface CommitPromptInput {
  files: string[];
  summary: string;
  snippets?: string;
}

function buildCommitPrompt(input: CommitPromptInput): string {
  const fileList =
    input.files.map((file) => `- ${file}`).join("\n") || "- (none)";

  return [
    "You are generating a single git commit subject line.",
    "",
    "Task:",
    "Write ONE conventional-commit message for the staged changes.",
    "",
    "Rules:",
    "- Output exactly one line and nothing else",
    "- Format: type: subject (NO scope)",
    "- Use imperative mood and present tense",
    "- Mention the main component or area changed",
    "- Do not use code fences, quotes, bullets, or explanations",
    "",
    "Type guidance:",
    "- feat: new user-facing behavior",
    "- fix: bug fix",
    "- refactor: structural/internal code improvements",
    "- docs: documentation only",
    "- test: tests only",
    "- chore: tooling/config/deps/maintenance",
    "",
    "Staged files:",
    fileList,
    "",
    "Change summary:",
    input.summary,
    input.snippets ? `\nCode context:\n${input.snippets}` : "",
    "",
    "Return only the commit message line.",
  ].join("\n");
}

export async function suggestCommitMessage(input: CommitPromptInput) {
  const ai = createAIClient();
  const model = "gemini-2.5-flash";
  const prompt = buildCommitPrompt(input);

  const result = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
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
