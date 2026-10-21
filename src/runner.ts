import fs from 'node:fs';
import path from 'node:path';

import { applyPatches } from './patcher';
import { createTask } from './state';
import { validateTask } from './validator';
import { MockProvider } from './providers/mock';
import type { Task } from './types';

export async function runTask(
  taskInput: Task,
  repoRoot: string = process.cwd()
) {
  const candidate = {
    task: taskInput,
    state: 'pending' as const,
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logs: []
  };

  const validation = validateTask(candidate);

  if (!validation.ok) {
    throw new Error(`Invalid task: ${validation.errors.join(' ')}`);
  }

  const normalizedRoot = path.resolve(repoRoot);

  if (!fs.existsSync(normalizedRoot) ||
      !fs.statSync(normalizedRoot).isDirectory()) {
    throw new Error(`Repository root not found: ${normalizedRoot}`);
  }

  const task = createTask(taskInput);
  const provider = new MockProvider();
  const proposal = await provider.generateProposal(task.task);

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
