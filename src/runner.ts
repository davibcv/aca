import fs from 'fs';
import path from 'path';

import { applyPatches } from './patcher';
import { createTask } from './state';
import { MockProvider } from './providers/mock';

export async function runTask(
  taskInput: {
    id: string;
    repo: string;
    description: string;
    branch?: string;
    criteria?: string[];
    maxAttempts?: number;
  },
  repoRoot: string = process.cwd()
) {
  const task = createTask(taskInput);

  const provider = new MockProvider();
  const proposal = await provider.generateProposal(task.task);

  if (!fs.existsSync(repoRoot)) {
    throw new Error(`Repository root not found: ${repoRoot}`);
  }

  const normalizedRoot = path.resolve(repoRoot);

  if (proposal.patches.length > 0) {
    applyPatches(normalizedRoot, proposal.patches);
  }

  return {
    task,
    summary: proposal.summary,
    applied: proposal.patches.length,
    repoRoot: normalizedRoot
  };
}
