import { execSync } from 'child_process';

/**
 * Gets all files in the repo that are NOT ignored by any .gitignore.
 * Includes both tracked and untracked files.
 */
export function getRepoFiles(gitRoot: string): string[] {
  try {
    // --others: Include untracked files
    // --cached: Include tracked files
    // --exclude-standard: Respect all .gitignore and standard exclude files
    // --full-name: Ensure we get the path relative to the git root
    const command = 'git ls-files --others --cached --exclude-standard';
    
    const output = execSync(command, { 
      cwd: gitRoot, 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large repos
    });

    return output.split('\n').filter(file => file.trim() !== '');
  } catch (error) {
    console.error("Failed to list git files:", error);
    return [];
  }
}