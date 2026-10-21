import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { applyPatches } from '../src/patcher';

const tempRoots: string[] = [];

function createRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aca-patcher-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('applyPatches security', () => {
  test('writes files inside the repository', () => {
    const root = createRoot();

    const result = applyPatches(root, [
      { path: 'src/example.ts', content: 'const safe = true;' }
    ]);

    expect(result.applied).toBe(1);
    expect(fs.readFileSync(path.join(root, 'src/example.ts'), 'utf8'))
      .toBe('const safe = true;');
  });

  test('rejects paths outside the repository without writing earlier patches', () => {
    const root = createRoot();
    const outside = path.join(path.dirname(root), `${path.basename(root)}-outside.txt`);

    expect(() =>
      applyPatches(root, [
        { path: 'safe.txt', content: 'should not be written' },
        { path: '../outside.txt', content: 'unauthorized' }
      ])
    ).toThrow();

    expect(fs.existsSync(path.join(root, 'safe.txt'))).toBe(false);
    expect(fs.existsSync(outside)).toBe(false);
  });

  test('rejects absolute paths', () => {
    const root = createRoot();
    const outside = path.join(path.dirname(root), 'unauthorized.txt');

    expect(() =>
      applyPatches(root, [{ path: outside, content: 'unauthorized' }])
    ).toThrow();
  });

  test('rejects empty paths, dot segments and backslashes', () => {
    const root = createRoot();
    const invalidPaths = [
      '',
      '   ',
      '.',
      'src/./example.ts',
      'src/../outside.ts',
      'src\\\\outside.ts'
    ];

    for (const invalidPath of invalidPaths) {
      expect(() =>
        applyPatches(root, [{ path: invalidPath, content: 'unauthorized' }])
      ).toThrow();
    }

    expect(fs.readdirSync(root)).toEqual([]);
  });

  test('rejects duplicate patch targets before writing', () => {
    const root = createRoot();
    expect(() => applyPatches(root, [
      { path: 'same.txt', content: 'first' },
      { path: 'same.txt', content: 'second' }
    ])).toThrow(/Duplicate patch target/);
    expect(fs.existsSync(path.join(root, 'same.txt'))).toBe(false);
  });

  test('rejects symbolic links pointing outside the repository', () => {
    const root = createRoot();
    const outsideDir = createRoot();
    const outsideFile = path.join(outsideDir, 'target.txt');

    fs.writeFileSync(outsideFile, 'original');
    fs.symlinkSync(outsideDir, path.join(root, 'linked'), 'dir');

    expect(() =>
      applyPatches(root, [{ path: 'linked/target.txt', content: 'changed' }])
    ).toThrow();

    expect(fs.readFileSync(outsideFile, 'utf8')).toBe('original');
  });
});
