import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { afterEach, describe, expect, test } from 'vitest';
import { git } from '../src/git';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('git command security', () => {
  test('passes arguments without executing shell commands', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aca-git-'));
    roots.push(root);

    execFileSync('git', ['init', '-q'], { cwd: root });

    const marker = path.join(root, 'injected.txt');
    const hostileArgument = `; touch ${marker}`;

    git(['status', hostileArgument], root);
    expect(fs.existsSync(marker)).toBe(false);
  });
});
