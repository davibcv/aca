import fs from 'node:fs';
import path from 'node:path';

type ReportPayload = Record<string, unknown> & { taskId?: string };

export function writeReport(repoRoot: string, result: ReportPayload) {
  const root = fs.realpathSync(path.resolve(repoRoot));

  if (!fs.statSync(root).isDirectory()) {
    throw new Error('Repository root must be a directory.');
  }

  const taskId = result.taskId ?? 'run';

  if (typeof taskId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
    throw new Error('Invalid taskId for report filename.');
  }

  const reportDir = path.join(root, '.aca_reports');

  if (fs.existsSync(reportDir) && fs.lstatSync(reportDir).isSymbolicLink()) {
    throw new Error('Report directory cannot be a symbolic link.');
  }

  fs.mkdirSync(reportDir, { recursive: true });

  const filename = path.join(reportDir, `${taskId}-${Date.now()}.json`);
  const content = JSON.stringify(result, null, 2);

  fs.writeFileSync(filename, content, { encoding: 'utf8', flag: 'wx' });

  return filename;
}
