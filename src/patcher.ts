import fs from 'fs';
import path from 'path';

export type Patch = {
  path: string;
  content: string;
};

export function applyPatches(repoRoot: string, patches: Patch[]) {
  for (const patch of patches) {
    const filePath = path.resolve(repoRoot, patch.path);
    const dir = path.dirname(filePath);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, patch.content, 'utf8');
  }

  return {
    applied: patches.length
  };
}
