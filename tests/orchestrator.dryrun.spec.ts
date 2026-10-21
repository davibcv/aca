
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
import { runWorkflow } from '../src/workflow';

describe('orchestrator read-only inspection', () => {
  const tmpRoot = path.join(
    os.tmpdir(),
    `aca-test-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  let originalRepoRoot: string | undefined;

  beforeAll(async () => {
    originalRepoRoot = process.env.ACA_REPO_ROOT;

    await fs.mkdir(path.join(tmpRoot, 'src'), { recursive: true });
    await fs.mkdir(path.join(tmpRoot, 'node_modules'), {
      recursive: true
    });

    await fs.writeFile(
      path.join(tmpRoot, 'src', 'sample.ts'),
      '// TODO: fix me\n// FIXME: investigate this\nconst x = 1;\n',
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

  test(
    'classifies findings, writes a JSON report through the workflow, skips dependencies, and applies no patches',
    async () => {
      const inspection = await runCycle({ dryRun: true });

      expect(inspection.ok).toBe(true);
      expect(inspection.applied).toBe(0);
      expect(inspection.inspection?.mode).toBe('read-only');
      expect(inspection.inspection?.repositoryRoot).toBe(tmpRoot);
      expect(inspection.inspection?.findings).toHaveLength(2);
      expect(inspection.inspection?.findings.every((finding) => finding.file === "src/sample.ts")).toBe(true);

      const inspectedPaths =
        inspection.inspection?.files.map((file) => file.path) ?? [];

      expect(inspectedPaths).toContain('src/sample.ts');
      expect(inspectedPaths).not.toContain('node_modules/ignored.ts');

      expect(inspection.inspection?.findings).toContainEqual(
        expect.objectContaining({
          file: 'src/sample.ts',
          line: 1,
          marker: 'TODO',
          category: 'maintenance',
          severity: 'low'
        })
      );

      expect(inspection.inspection?.findings).toContainEqual(
        expect.objectContaining({
          file: 'src/sample.ts',
          line: 2,
          marker: 'FIXME',
          category: 'maintenance',
          severity: 'medium'
        })
      );

      // A inspeção isolada não deve criar relatórios.
      await expect(
        fs.access(path.join(tmpRoot, '.aca_reports'))
      ).rejects.toThrow();

      const workflowResult = await runWorkflow({
        dryRun: true,
        repoRoot: tmpRoot
      });

      expect(workflowResult.ok).toBe(true);
      expect(workflowResult.applied).toBe(0);
      expect(workflowResult.reportPath).toBeTruthy();

      const reportContent = await fs.readFile(
        workflowResult.reportPath!,
        'utf8'
      );

      const report = JSON.parse(reportContent);

      expect(report.schemaVersion).toBe(1);
      expect(report.mode).toBe('read-only');
      expect(report.status).toBe('success');
      expect(report.repositoryRoot).toBe(tmpRoot);
      expect(report.summary.totalFindings).toBe(2);
      expect(report.summary.bySeverity).toEqual({
        low: 1,
        medium: 1
      });
      expect(report.summary.byCategory).toEqual({
        maintenance: 2
      });
      expect(report.findings).toHaveLength(2);
      expect(report.errors).toEqual([]);
      expect(typeof report.generatedAt).toBe('string');

      const inspectedReportPaths =
        workflowResult.inspection?.files.map((file) => file.path) ?? [];

      expect(inspectedReportPaths).not.toContain('.aca_reports/latest.json');
      expect(workflowResult.applied).toBe(0);
    }
  );
});
