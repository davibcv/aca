import { execSync } from 'child_process';

export function git(args: string[], cwd: string = process.cwd()): string {
  return execSync(`git ${args.join(' ')}`, {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
}

export function getGitStatus(cwd: string = process.cwd()): string {
  return git(['status', '--short'], cwd);
}

export function getCurrentBranch(cwd: string = process.cwd()): string {
  return git(['branch', '--show-current'], cwd);
}

export function getDiffSummary(cwd: string = process.cwd()): string {
  return git(['diff', '--stat'], cwd);
}

export function ensureBranch(branch: string, cwd: string = process.cwd()) {
  const current = getCurrentBranch(cwd);
  if (current !== branch) {
    try {
      git(['checkout', branch], cwd);
    } catch {
      git(['checkout', '-b', branch], cwd);
    }
  }
}
