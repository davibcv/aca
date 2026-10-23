import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { applyPatches } from '../src/patcher';

const tempRoots: string[] = [];

function createRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aca-patcher-rb-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('applyPatches pre-validation and isolation', () => {
  test('rejects batch without writing any file if one target is a directory', () => {
    const root = createRoot();
    fs.mkdirSync(path.join(root, 'sub-dir'));
    fs.writeFileSync(path.join(root, 'original.txt'), 'original content');

    expect(() =>
      applyPatches(root, [
        { path: 'original.txt', content: 'new content' },
        { path: 'sub-dir', content: 'cannot overwrite dir' }
      ])
    ).toThrow(/Patch target is not a regular file/);

    expect(fs.readFileSync(path.join(root, 'original.txt'), 'utf8')).toBe('original content');
  });

  test('rejects batch if any patch has invalid structure', () => {
    const root = createRoot();
    fs.writeFileSync(path.join(root, 'existing.txt'), 'clean');

    expect(() =>
      applyPatches(root, [
        { path: 'existing.txt', content: 'tainted' },
        { path: 123 as unknown as string, content: 'bad' }
      ])
    ).toThrow(/Invalid patch structure/);

    expect(fs.readFileSync(path.join(root, 'existing.txt'), 'utf8')).toBe('clean');
  });
});
