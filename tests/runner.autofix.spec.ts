import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { runTask } from '../src/runner';
import type { AIProvider } from '../src/providers/provider';
import type { Task, Proposal } from '../src/types';

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

class IterativeProvider implements AIProvider {
  private callCount = 0;

  async generateProposal(_task: Task): Promise<Proposal> {
    this.callCount++;
    if (this.callCount === 1) {
      return {
        summary: 'Proposta inicial com erro',
        patches: [{ path: 'resultado.txt', content: 'erro-inicial' }]
      };
    }
    return {
      summary: 'Proposta corrigida',
      patches: [{ path: 'resultado.txt', content: 'corrigido-com-sucesso' }]
    };
  }
}

describe('runTask auto-fix and verify loop', () => {
  test('executa ciclo de correcao com verificador customizado', async () => {
    const root = createTempDir('aca-autofix-repo-');
    process.env.ACA_STATE_DIR = createTempDir('aca-autofix-state-');

    const provider = new IterativeProvider();
    const task: Task = {
      id: 'task-autofix-loop',
      repo: root,
      description: 'Testar loop de correcao automatica'
    };

    let verifyAttempts = 0;
    const verifyFn = async (repoRoot: string) => {
      verifyAttempts++;
      const fileContent = fs.readFileSync(path.join(repoRoot, 'resultado.txt'), 'utf8');
      if (fileContent.includes('erro-inicial')) {
        return { ok: false, error: 'Conteudo invalido detectado' };
      }
      return { ok: true };
    };

    const result = await runTask(task, {
      repoRoot: root,
      provider,
      verify: verifyFn,
      maxAttempts: 3
    });

    expect(result.ok).toBe(true);
    expect(verifyAttempts).toBe(2);
    expect(fs.readFileSync(path.join(root, 'resultado.txt'), 'utf8')).toBe('corrigido-com-sucesso');
    expect(result.task.state).toBe('completed');
  });
});
