import fs from 'fs';
import path from 'path';

export type Patch = {
  path: string;
  content: string;
};

export function applyPatches(repoRoot: string, patches: Patch[]) {
  const absoluteRepoRoot = path.resolve(repoRoot);

  for (const patch of patches) {
    const filePath = path.resolve(absoluteRepoRoot, patch.path);

    // Garante que o caminho resolvido não subiu níveis além da raiz autorizada (Prevenção de Path Traversal)
    if (!filePath.startsWith(absoluteRepoRoot)) {
      throw new Error(`[Segurança] Bloqueada tentativa de gravação fora do repositório autorizado: ${patch.path}`);
    }

    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, patch.content, 'utf8');
  }

  return {
    applied: patches.length
  };
}
