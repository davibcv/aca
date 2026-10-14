import { TaskRecord } from './types';

export function validateTask(record: TaskRecord): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!record.task.id || record.task.id.trim() === '') {
    errors.push('Task id is required.');
  }

  if (!record.task.repo || record.task.repo.trim() === '') {
    errors.push('Task repo is required.');
  }

  if (!record.task.description || record.task.description.trim() === '') {
    errors.push('Task description is required.');
  }

  if (
    typeof record.task.maxAttempts === 'number' &&
    (Number.isNaN(record.task.maxAttempts) || record.task.maxAttempts < 1)
  ) {
    errors.push('Task maxAttempts must be a positive number.');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
