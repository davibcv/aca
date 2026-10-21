import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { writeReport } from '../src/report';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function createRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aca-report-'));
  roots.push(root);
  return root;
}

describe('report security', () => {
  test('rejects a task ID containing path separators', () => {
    const root = createRoot();

    expect(() =>
      writeReport(root, { taskId: '../outside' })
    ).toThrow('Invalid taskId');

    expect(fs.existsSync(path.join(root, '.aca_reports'))).toBe(false);
  });

  test('rejects a symbolic-link report directory', () => {
    const root = createRoot();
    const outside = path.join(root, 'outside');

    fs.mkdirSync(outside);
    fs.symlinkSync(outside, path.join(root, '.aca_reports'), 'dir');

    expect(() => writeReport(root, {})).toThrow(
      'Report directory cannot be a symbolic link.'
    );

    expect(fs.readdirSync(outside)).toEqual([]);
  });

  test('writes a valid report inside the report directory', () => {
    const root = createRoot();
    const filename = writeReport(root, { taskId: 'task-1', ok: true });

    expect(path.dirname(filename)).toBe(path.join(root, '.aca_reports'));
    expect(JSON.parse(fs.readFileSync(filename, 'utf8'))).toEqual({
      taskId: 'task-1',
      ok: true
    });
  });
});
