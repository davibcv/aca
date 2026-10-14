import { readAllTasks, saveTask, createTask } from './state';
import { createProvider } from './providerFactory';
import { applyPatches } from './patcher';
import { readConfig } from './config';
import { validateTask } from './validator';
import { execSync } from 'child_process';

function runValidationCommand(cmd: string, cwd: string): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8'
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message || ''
    };
  }
}

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

  taskRecord.attempts = (taskRecord.attempts ?? 0) + 1;

  const provider = createProvider();
  const proposal = await provider.generateProposal(taskRecord.task);

  if (proposal.patches.length > 0) {
    applyPatches(config.repoRoot, proposal.patches);
  }

  const criteria = taskRecord.task.criteria ?? [];
  const testResults: string[] = [];
  let allChecksPassed = true;

  for (const criterion of criteria) {
    let command = '';
    if (criterion === 'build' || criterion === 'typecheck') {
      command = 'npm run typecheck';
    } else if (criterion === 'lint') {
      command = 'npm run lint';
    } else if (criterion === 'test') {
      command = 'npm run test -- --watch=false --run';
    }

    if (command) {
      const result = runValidationCommand(command, config.repoRoot);
      if (!result.success) {
        allChecksPassed = false;
        const safeOutput = result.output.substring(0, 500);
        testResults.push(`[FALHA] Criterio ${criterion} falhou ao executar ${command}. Saida: ${safeOutput}`);
      } else {
        testResults.push(`[SUCESSO] Criterio ${criterion} validado com sucesso.`);
      }
    }
  }

  const maxAttempts = taskRecord.task.maxAttempts ?? 3;

  if (allChecksPassed) {
    taskRecord.state = 'completed';
    taskRecord.updatedAt = new Date().toISOString();
    taskRecord.logs = [
      ...(taskRecord.logs ?? []),
      `[Tentativa ` + String(taskRecord.attempts) + `] Patches aplicados com sucesso.`
    ];
  } else {
    if (taskRecord.attempts < maxAttempts) {
      taskRecord.state = 'pending';
      taskRecord.updatedAt = new Date().toISOString();
      taskRecord.logs = [
        ...(taskRecord.logs ?? []),
        `[Tentativa ` + String(taskRecord.attempts) + ` de ` + String(maxAttempts) + `] Correcao reprovada nos testes.`
      ];
    } else {
      taskRecord.state = 'failed';
      taskRecord.updatedAt = new Date().toISOString();
      taskRecord.logs = [
        ...(taskRecord.logs ?? []),
        `[Falha Definitiva] Limite maximo atingido.`
      ];
    }
  }

  saveTask(taskRecord);

  return {
    ok: allChecksPassed,
    inspected: taskRecord.task.id,
    taskId: taskRecord.task.id,
    summary: proposal.summary,
    applied: proposal.patches.length,
    errors: allChecksPassed ? undefined : testResults
  };
}
