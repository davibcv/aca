import fs from 'node:fs';
import path from 'node:path';

import type { TaskRecord, TaskState } from './types';

function getDbPaths() {
  const dbDir = path.resolve(
    process.env.ACA_STATE_DIR || path.join(process.cwd(), '.aca_state')
  );

  return {
    dir: dbDir,
    file: path.join(dbDir, 'tasks.json')
  };
}

function ensureDbDir(dir: string, file: string) {
  fs.mkdirSync(dir, { recursive: true });
  if (fs.lstatSync(dir).isSymbolicLink()) throw new Error("State directory cannot be a symbolic link.");
  if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw new Error("State database cannot be a symbolic link.");

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '[]', { encoding: 'utf8', flag: 'wx' });
  }
}

export function readAllTasks(): TaskRecord[] {
  const { dir, file } = getDbPaths();
  ensureDbDir(dir, file);

  const raw = fs.readFileSync(file, 'utf8');
  const parsed: unknown = JSON.parse(raw);

  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (record) =>
        typeof record === 'object' &&
        record !== null &&
        'task' in record &&
        typeof record.task === 'object' &&
        record.task !== null &&
        'id' in record.task &&
        typeof record.task.id === 'string'
    )
  ) {
    throw new Error('Invalid task database format; refusing to overwrite it.');
  }

  return parsed as TaskRecord[];
}

export function getTaskById(id: string): TaskRecord | undefined {
  const all = readAllTasks();
  return all.find((item) => item.task.id === id);
}

export function saveTask(record: TaskRecord) {
  const { dir, file } = getDbPaths();
  ensureDbDir(dir, file);

  const all = readAllTasks().filter((item) => item.task.id !== record.task.id);
  all.push(record);

  const tempFile = path.join(
    dir,
    `.tasks-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`
  );

  try {
    fs.writeFileSync(tempFile, JSON.stringify(all, null, 2), {
      encoding: 'utf8',
      flag: 'wx'
    });
    fs.renameSync(tempFile, file);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

export function updateTaskState(
  id: string,
  updates: {
    state?: TaskState;
    attempts?: number;
    log?: string;
  }
): TaskRecord {
  const record = getTaskById(id);
  if (!record) {
    throw new Error(`Task with id "${id}" not found.`);
  }

  if (updates.state !== undefined) {
    record.state = updates.state;
  }

  if (updates.attempts !== undefined) {
    record.attempts = updates.attempts;
  }

  if (updates.log) {
    record.logs = record.logs ?? [];
    record.logs.push(updates.log);
  }

  record.updatedAt = new Date().toISOString();
  saveTask(record);
  return record;
}

export function createTask(task: {
  id: string;
  repo: string;
  description: string;
  branch?: string;
  criteria?: string[];
  maxAttempts?: number;
}): TaskRecord {
  const existing = getTaskById(task.id);
  if (existing) {
    return existing;
  }

  const record: TaskRecord = {
    task,
    state: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logs: []
  };

  saveTask(record);
  return record;
}
