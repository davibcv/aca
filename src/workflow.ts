import fs from 'fs';
import path from 'path';
import { runCycle } from './orchestrator';
import { runTask } from './runner';
import { writeReport } from './report';
import type { AIProvider } from './providers/provider';
import type { Task, TaskFileContext } from './types';

export type WorkflowOptions = {
  dryRun?: boolean;
  repoRoot?: string;
  provider?: AIProvider;
  applyPatchesMode?: boolean;
  maxAttempts?: number;
};

const MAX_CONTEXT_FILE_SIZE_BYTES = 100 * 1024; // 100 KB por arquivo

function loadSafeFileContext(repoRoot: string, relativePath: string): TaskFileContext | null {
  try {
    const resolvedRepo = path.resolve(repoRoot);
    const resolvedPath = path.resolve(resolvedRepo, relativePath);

    // Evita escape do repo (path traversal)
    if (!resolvedPath.startsWith(resolvedRepo + path.sep) && resolvedPath !== resolvedRepo) {
      return null;
    }

    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile() || stat.size > MAX_CONTEXT_FILE_SIZE_BYTES) {
      return null;
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    return {
      path: relativePath,
      content
    };
  } catch {
    return null;
  }
}

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
    const uniqueFiles = Array.from(new Set(inspection.findings.map((f) => f.file)));
    const filesContext: TaskFileContext[] = [];

    for (const relPath of uniqueFiles) {
      const fileCtx = loadSafeFileContext(repoRoot, relPath);
      if (fileCtx) {
        filesContext.push(fileCtx);
      }
    }

    const task: Task = {
      id: `task-wf-${Date.now()}`,
      repo: repoRoot,
      description: `Resolver ${inspection.findings.length} apontamentos encontrados:\n` +
        inspection.findings
          .map((f) => `- [${f.marker}] ${f.file}:${f.line} -> ${f.text}`)
          .join('\n'),
      files: filesContext
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
