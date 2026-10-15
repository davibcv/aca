import { runCycle } from './orchestrator';
import { writeReport } from './report';

export async function runWorkflow(
  opts: { dryRun?: boolean; repoRoot?: string } = {}
) {
  const result = await runCycle(opts);
  const repoRoot = opts.repoRoot ?? process.cwd();

  if (!result.ok) {
    const reportPath = writeReport(repoRoot, {
      ...result,
      status: 'failed'
    });

    return {
      ...result,
      reportPath
    };
  }

  const reportPath = writeReport(repoRoot, {
    ...result,
    status: 'success'
  });

  return {
    ...result,
    reportPath
  };
}
