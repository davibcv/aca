import { runCycle } from './orchestrator';
import { writeReport } from './report';

export async function runWorkflow(opts: { dryRun?: boolean } = {}) {
  const result = await runCycle(opts);

  if (!result.ok) {
    const reportPath = writeReport(process.cwd(), {
      ...result,
      status: 'failed'
    });

    return {
      ...result,
      reportPath
    };
  }

  const reportPath = writeReport(process.cwd(), {
    ...result,
    status: 'success'
  });

  return {
    ...result,
    reportPath
  };
}
