import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { runAgent } from '../src/agent';
import { runTask } from '../src/runner';
import { enqueueTask } from '../src/service';
import type { Task } from '../src/types';

const tempDirs: string[] = [];
const originalStateDir = process.env.ACA_STATE_DIR;
const originalProvider = process.env.ACA_PROVIDER;

afterEach(() => {
  if (originalStateDir === undefined) {
    delete process.env.ACA_STATE_DIR;
  } else {
    process.env.ACA_STATE_DIR = originalStateDir;
  }

  if (originalProvider === undefined) {
    delete process.env.ACA_PROVIDER;
  } else {
    process.env.ACA_PROVIDER = originalProvider;
  }

  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createTempDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

describe('agent and runner contracts', () => {
  test('runAgent rejects invalid task input', async () => {
    const invalidTask = {
      id: '',
      repo: '',
      description: ''
    } as unknown as Task;

    const res = await runAgent(invalidTask);
    expect(res.ok).toBe(false);
    expect(res.errors).toBeDefined();
    expect(res.errors?.length).toBeGreaterThan(0);
  });

  test('runAgent generates proposal with MockProvider by default', async () => {
    const stateDir = createTempDir('aca-state-');
    process.env.ACA_STATE_DIR = stateDir;
    process.env.ACA_PROVIDER = 'mock';

    const validTask: Task = {
      id: 'task-contract-1',
      repo: '/tmp/repo',
      description: 'Test contract description'
    };

    const res = await runAgent(validTask);
    expect(res.ok).toBe(true);
    expect(res.task).toBeDefined();
    expect(res.task?.task.id).toBe('task-contract-1');
    expect(res.summary).toContain('Mock proposal');
    expect(Array.isArray(res.patches)).toBe(true);
    expect(res.branch).toBe('feature/phase-2');
  });

  test('enqueueTask delegates cleanly to runAgent', async () => {
    const stateDir = createTempDir('aca-state-');
    process.env.ACA_STATE_DIR = stateDir;
    process.env.ACA_PROVIDER = 'mock';

    const res = await enqueueTask({
      id: 'task-service-1',
      repo: '/tmp/repo-service',
      description: 'Service contract description'
    });

    expect(res.ok).toBe(true);
    expect(res.task?.task.id).toBe('task-service-1');
  });

  test('runTask throws on nonexistent repoRoot directory', async () => {
    const stateDir = createTempDir('aca-state-');
    process.env.ACA_STATE_DIR = stateDir;

    const task: Task = {
      id: 'task-run-invalid',
      repo: '/tmp/repo-not-exist',
      description: 'Missing repo test'
    };

    await expect(runTask(task, '/path/that/definitely/does/not/exist/9999')).rejects.toThrow(
      /Repository root not found/
    );
  });
});
