import { runAgent } from './agent';
import { createTask } from './state';

export async function enqueueTask(taskInput: {
  id: string;
  repo: string;
  description: string;
  branch?: string;
  criteria?: string[];
  maxAttempts?: number;
}) {
  const task = createTask(taskInput);

  const result = await runAgent(task.task);

  return {
    ...result,
    storedTask: task
  };
}
