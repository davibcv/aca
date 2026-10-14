import { runCycle } from '../src/orchestrator';

test('orchestrator dry-run returns ok', async () => {
  const res = await runCycle({ dryRun: true });
  expect(res).toBeDefined();
  expect(res.ok).toBe(true);
  expect(res.inspected).toContain('dry-run');
});
