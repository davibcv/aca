export type Task = {
  id: string;
  repo: string;
  branch?: string;
  description: string;
  criteria?: string[];
  maxAttempts?: number;
};

export type TaskState = 'pending' | 'running' | 'failed' | 'completed' | 'cancelled';

export interface TaskRecord {
  task: Task;
  state: TaskState;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  logs?: string[];
}
