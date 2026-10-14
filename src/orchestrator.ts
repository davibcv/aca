import { readAllTasks, saveTask, createTask } from './state';
import { createProvider } from './providerFactory';
import { applyPatches } from './patcher';
import { readConfig } from './config';
import { validateTask } from './validator';

export async function runCycle(opts: { dryRun?: boolean } = {}): Promise<{
  ok: boolean;
  inspected?: string;
  taskId?: string;
  summary?: string;
  applied?: number;
  errors?: string[];
}> {
  const config = readConfig();

  if (opts.dryRun) {
    return {
      ok: true,
      inspected: `dry-run: ${config.repoRoot}`
    };
  }

  const tasks = readAllTasks();

  let taskRecord = tasks.find(t => t.state === 'pending');

  if (!taskRecord) {
    taskRecord = createTask({
      id: 'aca-demo-task',
      repo: 'davibcv/aca',
      description: 'Bootstrap ACA cycle',
      branch: config.branch,
      criteria: ['build', 'lint', 'test'],
      maxAttempts: 3
    });

    taskRecord.state = 'pending';
    saveTask(taskRecord);
  }

  const validation = validateTask(taskRecord);

  if (!validation.ok) {
    taskRecord.state = 'failed';
    taskRecord.updatedAt = new Date().toISOString();
    taskRecord.logs = [
      ...(taskRecord.logs ?? []),
      `Validation failed: ${validation.errors.join('; ')}`
    ];
    saveTask(taskRecord);

    return {
      ok: false,
      inspected: taskRecord.task.id,
      taskId: taskRecord.task.id,
      errors: validation.errors
    };
  }

  const provider = createProvider();
  const proposal = await provider.generateProposal(taskRecord.task);

  if (proposal.patches.length > 0) {
    applyPatches(config.repoRoot, proposal.patches);
  }

  taskRecord.state = 'completed';
  taskRecord.updatedAt = new Date().toISOString();
  taskRecord.logs = [
    ...(taskRecord.logs ?? []),
    JSON.stringify({
      summary: proposal.summary,
      applied: proposal.patches.length,
      repoRoot: config.repoRoot
    })
  ];

  saveTask(taskRecord);

  return {
    ok: true,
    inspected: taskRecord.task.id,
    taskId: taskRecord.task.id,
    summary: proposal.summary,
    applied: proposal.patches.length
  };
}
