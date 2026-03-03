import { pack } from 'repomix';

export async function generateAIContext(gitRoot: string) {
  const result = await pack([gitRoot], {
    cwd: gitRoot,
    include: ["src/**/*"],
    exclude: ["node_modules/**", "dist/**", ".git/**"],
    //@ts-ignore
    output: {
      filePath: 'repomix-output.xml',
      style: 'xml',
      parsableStyle: true,
      fileSummary: true,
      directoryStructure: true,
      files: true,
      removeComments: true,
      removeEmptyLines: true,
      compress: true,
      topFilesLength: 10,
      showLineNumbers: false,
      copyToClipboard: false,
      includeEmptyDirectories: false,
      truncateBase64: true,
      includeFullDirectoryStructure: false,
      tokenCountTree: false,
    },
  });

  // We use the as any cast here because the library's return type 
  // is often complex, but we just need the final string content.
  return (result as any).content || ""; 
}