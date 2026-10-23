import { runCycle } from './orchestrator';
import { runTask } from './runner';
import { writeReport } from './report';
import type { AIProvider } from './providers/provider';
import type { Task } from './types';

export type WorkflowOptions = {
  dryRun?: boolean;
  repoRoot?: string;
  provider?: AIProvider;
  applyPatchesMode?: boolean;
  maxAttempts?: number;
};

export async function runWorkflow(opts: WorkflowOptions = {}) {
  const result = await runCycle(opts);
  const repoRoot = opts.repoRoot ?? process.cwd();
  const inspection = result.inspection;

  let executionResult:
    | {
        ok: boolean;
        applied: number;
        summary: string;
        taskId?: string;
        error?: string;
      }
    | undefined;

  const shouldExecutePatches =
    Boolean(opts.applyPatchesMode) ||
    process.env.ACA_APPLY_PATCHES === '1' ||
    process.env.ACA_APPLY_PATCHES === 'true';

  if (shouldExecutePatches && inspection && inspection.findings.length > 0) {
    const task: Task = {
      id: `task-wf-${Date.now()}`,
      repo: repoRoot,
      description: `Resolver ${inspection.findings.length} apontamentos encontrados:\n` +
        inspection.findings
          .map((f) => `- [${f.marker}] ${f.file}:${f.line} -> ${f.text}`)
          .join('\n')
    };

    const taskExecution = await runTask(task, {
      repoRoot,
      provider: opts.provider,
      dryRun: Boolean(opts.dryRun),
      maxAttempts: opts.maxAttempts ?? 3
    });

    executionResult = {
      ok: taskExecution.ok,
      applied: taskExecution.applied,
      summary: taskExecution.summary,
      taskId: taskExecution.task.task.id,
      error: taskExecution.error
    };
  }

  const overallStatus =
    executionResult !== undefined
      ? executionResult.ok
        ? 'success'
        : 'failed'
      : result.ok
        ? 'success'
        : 'failed';

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: shouldExecutePatches ? (opts.dryRun ? 'dry-run-patch' : 'live-patch') : 'read-only',
    repositoryRoot: inspection?.repositoryRoot ?? repoRoot,
    status: overallStatus,
    summary: {
      filesInspected: inspection?.filesInspected ?? 0,
      totalBytesRead: inspection?.totalBytesRead ?? 0,
      totalFindings: inspection?.findings.length ?? 0,
      appliedPatches: executionResult?.applied ?? 0,
      bySeverity: {
        low:
          inspection?.findings.filter((finding) => finding.severity === 'low')
            .length ?? 0,
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
    execution: executionResult,
    errors: [
      ...(result.errors ?? []),
      ...(executionResult?.error ? [executionResult.error] : [])
    ]
  };

  const reportPath = writeReport(repoRoot, {
    taskId: executionResult?.taskId ?? result.taskId,
    ...report
  });

  return {
    ...result,
    ok: overallStatus === 'success',
    applied: executionResult?.applied ?? 0,
    reportPath,
    execution: executionResult
  };
}
