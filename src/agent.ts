import { createProvider } from './providerFactory';
import { createTask } from './state';
import { validateTask } from './validator';

export async function runAgent(taskInput: {
  id: string;
  repo: string;
  description: string;
  branch?: string;
  criteria?: string[];
  maxAttempts?: number;
}) {
  const task = createTask(taskInput);
  const validation = validateTask(task);

  if (!validation.ok) {
    return {
      ok: false,
      task,
      errors: validation.errors
    };
  }

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
