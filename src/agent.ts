import { createProvider } from './providerFactory';
import { createTask } from './state';
import { validateTask } from './validator';
import type { Task } from './types';

export async function runAgent(taskInput: Task) {
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
    return {
      ok: false,
      errors: validation.errors
    };
  }

  const task = createTask(taskInput);
  const provider = createProvider();
  const proposal = await provider.generateProposal(task.task);

  return {
    ok: true,
    task,
    summary: proposal.summary,
    patches: proposal.patches,
    repo: task.task.repo,
    branch: task.task.branch ?? 'feature/phase-2'
  };
}
