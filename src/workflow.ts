
import { runCycle } from './orchestrator';
import { writeReport } from './report';

export async function runWorkflow(
  opts: { dryRun?: boolean; repoRoot?: string } = {}
) {
  const result = await runCycle(opts);
  const repoRoot = opts.repoRoot ?? process.cwd();
  const inspection = result.inspection;

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    repositoryRoot: inspection?.repositoryRoot ?? repoRoot,
    status: result.ok ? 'success' : 'failed',
    summary: {
      filesInspected: inspection?.filesInspected ?? 0,
      totalBytesRead: inspection?.totalBytesRead ?? 0,
      totalFindings: inspection?.findings.length ?? 0,
      bySeverity: {
        low:
          inspection?.findings.filter(
            (finding) => finding.severity === 'low'
          ).length ?? 0,
        medium:
          inspection?.findings.filter(
            (finding) => finding.severity === 'medium'
          ).length ?? 0
      },
      byCategory: {
        maintenance:
          inspection?.findings.filter(
            (finding) => finding.category === 'maintenance'
          ).length ?? 0
      },
      truncated: inspection?.truncated ?? false
    },
    findings: inspection?.findings ?? [],
    errors: result.errors ?? []
  };

  const reportPath = writeReport(repoRoot, {
    taskId: result.taskId,
    ...report
  });

  return {
    ...result,
    reportPath
  };
}
