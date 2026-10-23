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

describe('applyPatches content integrity traps', () => {
  test('rejects empty content patch by default without modifying target', () => {
    const root = createRoot();
    fs.writeFileSync(path.join(root, 'target.ts'), 'export const a = 1;');

    expect(() =>
      applyPatches(root, [{ path: 'target.ts', content: '   \n  ' }])
    ).toThrow(/Patch vazio rejeitado/);

    expect(fs.readFileSync(path.join(root, 'target.ts'), 'utf8')).toBe('export const a = 1;');
  });

  test('rejects catastrophic shrink in existing files', () => {
    const root = createRoot();
    const substantialContent = 'export function calculate() {\n' + '  const x = 10;\n'.repeat(20) + '  return x;\n}\n';
    fs.writeFileSync(path.join(root, 'math.ts'), substantialContent);

    expect(() =>
      applyPatches(root, [{ path: 'math.ts', content: 'export const x = 1;\n' }])
    ).toThrow(/Redução excessiva de conteúdo detectada/);

    expect(fs.readFileSync(path.join(root, 'math.ts'), 'utf8')).toBe(substantialContent);
  });
});
