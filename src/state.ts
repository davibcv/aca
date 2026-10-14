import fs from 'fs';
import path from 'path';

import { TaskRecord } from './types';

const DB_DIR = path.resolve(process.cwd(), '.aca_state');
const DB_FILE = path.join(DB_DIR, 'tasks.json');

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]', 'utf8');
}

export function readAllTasks(): TaskRecord[] {
  ensureDbDir();
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  try {
    return JSON.parse(raw) as TaskRecord[];
  } catch {
    return [];
  }
}

export function saveTask(record: TaskRecord) {
  const all = readAllTasks().filter(r => r.task.id !== record.task.id);
  all.push(record);
  fs.writeFileSync(DB_FILE, JSON.stringify(all, null, 2), 'utf8');
}

export function createTask(task: { id: string; repo: string; description: string; branch?: string; criteria?: string[]; maxAttempts?: number }): TaskRecord {
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
