import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { runTask } from '../src/runner';
import { MockProvider } from '../src/providers/mock';
import type { Task } from '../src/types';

const tempRoots: string[] = [];
const originalStateDir = process.env.ACA_STATE_DIR;

afterEach(() => {
  if (originalStateDir === undefined) {
    delete process.env.ACA_STATE_DIR;
  } else {
    process.env.ACA_STATE_DIR = originalStateDir;
  }

  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function createTempDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}

describe('runTask execution flow', () => {
  test('executa tarefa sem patches e registra conclusao basica', async () => {
    const root = createTempDir('aca-runner-repo-');
    process.env.ACA_STATE_DIR = createTempDir('aca-runner-state-');

    const task: Task = {
      id: 'task-runner-basic',
      repo: root,
      description: 'Execucao basica controlada'
    };

    const result = await runTask(task, { repoRoot: root });

    expect(result.ok).toBe(true);
    expect(result.task.task.id).toBe('task-runner-basic');
    expect(result.task.state).toBe('completed');
    expect(result.applied).toBe(0);
    expect(result.repoRoot).toBe(root);
  });

  test('respeita dryRun sem alterar arquivos', async () => {
    const root = createTempDir('aca-runner-dry-');
    process.env.ACA_STATE_DIR = createTempDir('aca-runner-state-');

    const provider = new MockProvider({
      summary: 'Patch simulado',
      patches: [{ path: 'arquivo.txt', content: 'novo conteudo' }]
    });

    const task: Task = {
      id: 'task-dryrun',
      repo: root,
      description: 'Teste dry run'
    };

    const result = await runTask(task, {
      repoRoot: root,
      provider,
      dryRun: true
    });

    expect(result.ok).toBe(true);
    expect(result.applied).toBe(0);
    expect(fs.existsSync(path.join(root, 'arquivo.txt'))).toBe(false);
    expect(result.task.state).toBe('completed');
  });

  test('aplica patches quando dryRun for falso', async () => {
    const root = createTempDir('aca-runner-apply-');
    process.env.ACA_STATE_DIR = createTempDir('aca-runner-state-');

    const provider = new MockProvider({
      summary: 'Patch real aplicado',
      patches: [{ path: 'modificado.txt', content: 'conteudo aplicado' }]
    });

    const task: Task = {
      id: 'task-apply',
      repo: root,
      description: 'Teste aplicacao real'
    };

    const result = await runTask(task, {
      repoRoot: root,
      provider,
      dryRun: false
    });

    expect(result.ok).toBe(true);
    expect(result.applied).toBe(1);
    expect(fs.readFileSync(path.join(root, 'modificado.txt'), 'utf8')).toBe(
      'conteudo aplicado'
    );
    expect(result.task.state).toBe('completed');
  });
});
