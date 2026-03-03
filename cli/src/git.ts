import fs from 'fs';
import path from 'path';

export function findGitRoot(startDir: string): string | null {
  let currentDir = path.resolve(startDir);

  while (currentDir !== path.parse(currentDir).root) {
    const gitPath = path.join(currentDir, '.git');
    if (fs.existsSync(gitPath) && fs.statSync(gitPath).isDirectory()) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}