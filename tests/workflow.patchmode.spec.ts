import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { runWorkflow } from '../src/workflow';
import { MockProvider } from '../src/providers/mock';

const tempRoots: string[] = [];
const originalStateDir = process.env.ACA_STATE_DIR;

afterEach(async () => {
  if (originalStateDir === undefined) {
    delete process.env.ACA_STATE_DIR;
  } else {
    process.env.ACA_STATE_DIR = originalStateDir;
  }

  for (const root of tempRoots.splice(0)) {
    await fs.rm(root, { recursive: true, force: true });
  }
});

async function createTempRepo() {
  const root = path.join(os.tmpdir(), `aca-wf-patch-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await fs.mkdir(path.join(root, 'src'), { recursive: true });
  tempRoots.push(root);
  return root;
}

describe('workflow patch mode execution', () => {
  test('dispara aplicacao de patch quando applyPatchesMode for ativo', async () => {
    const root = await createTempRepo();
    process.env.ACA_STATE_DIR = path.join(root, '.aca_state');

    await fs.writeFile(
      path.join(root, 'src', 'app.ts'),
      '// TODO: implementar rota principal\nconst app = true;\n',
      'utf8'
    );

    const provider = new MockProvider({
      summary: 'Rotas implementadas e TODO removido',
      patches: [
        {
          path: 'src/app.ts',
          content: 'export const app = { route: "/api" };\n'
        }
      ]
    });

    const result = await runWorkflow({
      repoRoot: root,
      applyPatchesMode: true,
      dryRun: false,
      provider
    });

    expect(result.ok).toBe(true);
    expect(result.applied).toBe(1);
    expect(result.execution).toBeDefined();
    expect(result.execution?.ok).toBe(true);

    const updatedContent = await fs.readFile(path.join(root, 'src', 'app.ts'), 'utf8');
    expect(updatedContent).toBe('export const app = { route: "/api" };\n');

    const reportContent = await fs.readFile(result.reportPath!, 'utf8');
    const report = JSON.parse(reportContent);
    expect(report.mode).toBe('live-patch');
    expect(report.summary.appliedPatches).toBe(1);
  });
});
