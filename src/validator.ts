import type { TaskRecord } from './types';

export function validateTask(
  record: TaskRecord
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const task = record?.task;

  if (!task || typeof task !== 'object') {
    return { ok: false, errors: ['Task is required.'] };
  }

  if (typeof task.id !== 'string' || !task.id.trim()) {
    errors.push('Task id is required.');
  }

  if (typeof task.repo !== 'string' || !task.repo.trim()) {
    errors.push('Task repo is required.');
  }

  if (typeof task.description !== 'string' || !task.description.trim()) {
    errors.push('Task description is required.');
  }

  if (
    task.maxAttempts !== undefined &&
    (!Number.isInteger(task.maxAttempts) || task.maxAttempts < 1)
  ) {
    errors.push('Task maxAttempts must be a positive integer.');
  }

  if (
    task.criteria !== undefined &&
    (!Array.isArray(task.criteria) ||
      !task.criteria.every(
        (criterion) => typeof criterion === 'string' && criterion.trim()
      ))
  ) {
    errors.push('Task criteria must contain non-empty strings.');
  }

  if (
    task.branch !== undefined &&
    (typeof task.branch !== 'string' || !task.branch.trim())
  ) {
    errors.push('Task branch must be a non-empty string.');
  }

  return { ok: errors.length === 0, errors };
}
