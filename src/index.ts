import { readConfig } from './config';
import { runTask } from './runner';

async function main() {
  const config = readConfig();

  const task = {
    id: 'aca-task-01',
    repo: 'davibcv/aca',
    description: 'Phase 2 scaffold bootstrap',
    branch: config.branch,
    criteria: ['build', 'lint', 'test'],
    maxAttempts: 3
  };

  const result = await runTask(task, config.repoRoot);

  console.log(JSON.stringify({
    taskId: result.task.task.id,
    summary: result.summary,
    applied: result.applied,
    repoRoot: result.repoRoot
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error('ACA bootstrap failed:', error);
  process.exit(1);
});
