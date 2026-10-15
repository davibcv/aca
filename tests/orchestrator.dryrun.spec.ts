import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test
} from 'vitest';
import { runCycle } from '../src/orchestrator';

describe('orchestrator read-only inspection', () => {
  const tmpRoot = path.join(
    os.tmpdir(),
    `aca-test-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  let originalRepoRoot: string | undefined;

  beforeAll(async () => {
    originalRepoRoot = process.env.ACA_REPO_ROOT;

    await fs.mkdir(path.join(tmpRoot, 'src'), { recursive: true });
    await fs.mkdir(path.join(tmpRoot, 'node_modules'), { recursive: true });

    await fs.writeFile(
      path.join(tmpRoot, 'src', 'sample.ts'),
      '// TODO: fix me\nconst x = 1;\n',
      'utf8'
    );

    await fs.writeFile(
      path.join(tmpRoot, 'node_modules', 'ignored.ts'),
      '// FIXME: this should be ignored\n',
      'utf8'
    );

    process.env.ACA_REPO_ROOT = tmpRoot;
  });

  afterAll(async () => {
    if (originalRepoRoot === undefined) {
      delete process.env.ACA_REPO_ROOT;
    } else {
      process.env.ACA_REPO_ROOT = originalRepoRoot;
    }

    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  test('finds TODO markers and skips node_modules without applying patches', async () => {
    const res = await runCycle({ dryRun: true });

    expect(res.ok).toBe(true);
    expect(res.applied).toBe(0);
    expect(res.inspection?.mode).toBe('read-only');

    const inspectedPaths = res.inspection?.files.map((file) => file.path) ?? [];

    expect(inspectedPaths).toContain('src/sample.ts');
    expect(inspectedPaths).not.toContain('node_modules/ignored.ts');

    const findings = res.inspection?.findings ?? [];

    expect(findings).toContainEqual(
      expect.objectContaining({
        file: 'src/sample.ts',
        line: 1,
        marker: 'TODO'
      })
    );

    const rootEntries = await fs.readdir(tmpRoot);

    expect(rootEntries).not.toContain('.aca_reports');
  });
});
