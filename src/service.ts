import { runAgent } from './agent';

export async function enqueueTask(taskInput: {
  id: string;
  repo: string;
  description: string;
  branch?: string;
  criteria?: string[];
  maxAttempts?: number;
}) {
  return await runAgent(taskInput);
}
