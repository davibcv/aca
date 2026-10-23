import fs from 'node:fs';
import path from 'node:path';

import { applyPatches } from './patcher';
import { createTask, updateTaskState } from './state';
import { validateTask } from './validator';
import { createProvider } from './providerFactory';
import type { AIProvider } from './providers/provider';
import type { Task, TaskRecord } from './types';

export type VerifyResult = {
  ok: boolean;
  error?: string;
};

export type VerifyFn = (repoRoot: string) => Promise<VerifyResult> | VerifyResult;

export type RunTaskOptions = {
  repoRoot?: string;
  provider?: AIProvider;
  dryRun?: boolean;
  verify?: VerifyFn;
  maxAttempts?: number;
};

export type RunTaskResult = {
  ok: boolean;
  task: TaskRecord;
  summary: string;
  applied: number;
  repoRoot: string;
  error?: string;
};

type FileBackup = {
  targetPath: string;
  existed: boolean;
  content?: string;
};

function createBackups(repoRoot: string, patchPaths: string[]): FileBackup[] {
  return patchPaths.map((relPath) => {
    const fullPath = path.resolve(repoRoot, relPath);
    const exists = fs.existsSync(fullPath);
    return {
      targetPath: fullPath,
      existed: exists,
      content: exists ? fs.readFileSync(fullPath, 'utf8') : undefined
    };
  });
}

function restoreBackups(backups: FileBackup[]): void {
  for (const backup of backups) {
    if (backup.existed && backup.content !== undefined) {
      fs.mkdirSync(path.dirname(backup.targetPath), { recursive: true });
      fs.writeFileSync(backup.targetPath, backup.content, 'utf8');
    } else if (!backup.existed && fs.existsSync(backup.targetPath)) {
      fs.unlinkSync(backup.targetPath);
    }
  }
}

export async function runTask(
  taskInput: Task,
  repoRootOrOpts: string | RunTaskOptions = process.cwd()
): Promise<RunTaskResult> {
  const opts: RunTaskOptions =
    typeof repoRootOrOpts === 'string'
      ? { repoRoot: repoRootOrOpts }
      : repoRootOrOpts;

  const candidate = {
    task: taskInput,
    state: 'pending' as const,
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logs: []
  };

  const validation = validateTask(candidate);

  if (!validation.ok) {
    throw new Error(`Invalid task: ${validation.errors.join(' ')}`);
  }

  const normalizedRoot = path.resolve(opts.repoRoot ?? process.cwd());

  if (
    !fs.existsSync(normalizedRoot) ||
    !fs.statSync(normalizedRoot).isDirectory()
  ) {
    throw new Error(`Repository root not found: ${normalizedRoot}`);
  }

  const task = createTask(taskInput);
  const provider = opts.provider ?? createProvider();
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 1);

  let currentAttempt = 0;
  let lastError: string | undefined;
  let totalApplied = 0;
  let latestSummary = '';

  while (currentAttempt < maxAttempts) {
    currentAttempt++;

    updateTaskState(task.task.id, {
      state: 'running',
      attempts: currentAttempt,
      log: `Tentativa ${currentAttempt}/${maxAttempts} para a tarefa ${task.task.id}`
    });

    let backups: FileBackup[] = [];
    let appliedThisAttempt = 0;

    try {
      const taskForAttempt: Task = lastError
        ? {
            ...task.task,
            description: `${task.task.description}\n\n[Falha anterior]: ${lastError}`
          }
        : task.task;

      const proposal = await provider.generateProposal(taskForAttempt);
      latestSummary = proposal.summary;

      const shouldApply = !opts.dryRun && proposal.patches.length > 0;

      if (shouldApply) {
        backups = createBackups(
          normalizedRoot,
          proposal.patches.map((p) => p.path)
        );
        const patchResult = applyPatches(normalizedRoot, proposal.patches);
        appliedThisAttempt = patchResult.applied;
      }

      if (opts.verify) {
        const verifyOutcome = await opts.verify(normalizedRoot);
        if (!verifyOutcome.ok) {
          if (backups.length > 0) {
            restoreBackups(backups);
          }
          lastError = verifyOutcome.error ?? 'Verificacao falhou sem mensagem detalhada.';
          continue;
        }
      }

      totalApplied += appliedThisAttempt;

      const updatedTask = updateTaskState(task.task.id, {
        state: 'completed',
        log: opts.dryRun
          ? `Dry-run executado na tentativa ${currentAttempt}: ${proposal.patches.length} patches gerados.`
          : `Execucao concluida na tentativa ${currentAttempt}: total de ${totalApplied} patches aplicados.`
      });

      return {
        ok: true,
        task: updatedTask,
        summary: latestSummary,
        applied: totalApplied,
        repoRoot: normalizedRoot
      };
    } catch (err) {
      if (backups.length > 0) {
        restoreBackups(backups);
      }
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  const failedTask = updateTaskState(task.task.id, {
    state: 'failed',
    log: `Falha apos ${maxAttempts} tentativa(s): ${lastError}`
  });

  return {
    ok: false,
    task: failedTask,
    summary: latestSummary || 'Falha durante execucao da tarefa',
    applied: totalApplied,
    repoRoot: normalizedRoot,
    error: lastError
  };
}
