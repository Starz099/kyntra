import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "",
});

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
    return { files: [] };
  }
}
