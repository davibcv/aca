import fs from 'fs';
import path from 'path';

export function writeReport(repoRoot: string, result: any) {
  const reportDir = path.join(repoRoot, '.aca_reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const filename = path.join(reportDir, `${result.taskId ?? 'run'}-${Date.now()}.json`);
  fs.writeFileSync(filename, JSON.stringify(result, null, 2), 'utf8');
  return filename;
}
