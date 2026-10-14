import { test, expect } from 'vitest';
import { runCycle } from '../src/orchestrator';

test('orchestrator inspeciona arquivos em modo somente leitura', async () => {
  const res = await runCycle({ dryRun: true });

  expect(res).toBeDefined();
  expect(res.ok).toBe(true);
  expect(res.inspected).toContain('Read-only inspection');
  expect(res.applied).toBe(0);
  expect(res.inspection).toBeDefined();
  expect(res.inspection?.mode).toBe('read-only');
  expect(res.inspection?.filesInspected).toBeGreaterThan(0);
});
