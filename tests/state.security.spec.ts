import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createTask, getTaskById, readAllTasks, updateTaskState } from '../src/state';

const roots: string[] = [];
const originalStateDir = process.env.ACA_STATE_DIR;

afterEach(() => {
  if (originalStateDir === undefined) {
    delete process.env.ACA_STATE_DIR;
  } else {
    process.env.ACA_STATE_DIR = originalStateDir;
  }

  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function useTemporaryDatabase() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aca-state-'));
  roots.push(root);
  process.env.ACA_STATE_DIR = root;
  return path.join(root, 'tasks.json');
}

describe('task state security', () => {
  test('creates and reads a task', () => {
    useTemporaryDatabase();

    createTask({
      id: 'test-1',
      repo: '/tmp/example',
      description: 'Test task'
    });

    expect(readAllTasks()).toHaveLength(1);
    expect(readAllTasks()[0].task.id).toBe('test-1');
  });

  test('does not duplicate task on repeated createTask calls with same id', () => {
    useTemporaryDatabase();

    const first = createTask({
      id: 'test-idempotent',
      repo: '/tmp/example',
      description: 'Initial'
    });

    const second = createTask({
      id: 'test-idempotent',
      repo: '/tmp/example',
      description: 'Updated attempt'
    });

    expect(readAllTasks()).toHaveLength(1);
    expect(second.createdAt).toBe(first.createdAt);
  });

  test('updates task state, attempts and appends logs', () => {
    useTemporaryDatabase();

    createTask({
      id: 'test-update',
      repo: '/tmp/example',
      description: 'To update'
    });

    updateTaskState('test-update', {
      state: 'running',
      attempts: 1,
      log: 'Iniciando execucao'
    });

    const updated = getTaskById('test-update');
    expect(updated).toBeDefined();
    expect(updated?.state).toBe('running');
    expect(updated?.attempts).toBe(1);
    expect(updated?.logs).toContain('Iniciando execucao');
  });

  test('throws when updating non-existent task', () => {
    useTemporaryDatabase();

    expect(() =>
      updateTaskState('non-existent', { state: 'failed' })
    ).toThrow(/Task with id "non-existent" not found/);
  });

  test('refuses to overwrite a corrupted database', () => {
    const file = useTemporaryDatabase();
    fs.writeFileSync(file, '{invalid json', 'utf8');

    expect(() => createTask({
      id: 'test-2',
      repo: '/tmp/example',
      description: 'Test task'
    })).toThrow();

    expect(fs.readFileSync(file, 'utf8')).toBe('{invalid json');
  });
});
