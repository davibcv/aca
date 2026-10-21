import fs from 'node:fs';
import path from 'node:path';

export type Patch = {
  path: string;
  content: string;
};

function resolveSafePath(root: string, relativePath: string): string {
  if (
    !relativePath.trim() ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("\\") ||
    relativePath.split(/[\\/]/).some((part) => part === "." || part === "..")
  ) {
    throw new Error(`[Segurança] Caminho inválido: ${relativePath}`);
  }

  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);

  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`[Segurança] Escrita fora do repositório bloqueada: ${relativePath}`);
  }

  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`[Segurança] Caminhos simbólicos não são permitidos: ${relativePath}`);
    }
  }

  return target;
}

export function applyPatches(repoRoot: string, patches: Patch[]) {
  if (!Array.isArray(patches)) throw new Error('Patches must be an array.');
  const root = fs.realpathSync(path.resolve(repoRoot));
  const seen = new Set<string>();

  // Valida todos os caminhos antes de escrever qualquer arquivo.
  const targets = patches.map((patch) => {
    if (!patch || typeof patch.path !== 'string' || typeof patch.content !== 'string') throw new Error('Invalid patch structure.');
    const target = resolveSafePath(root, patch.path);
    if (seen.has(target)) throw new Error('Duplicate patch target.');
    seen.add(target);
    if (fs.existsSync(target) && !fs.lstatSync(target).isFile()) throw new Error('Patch target is not a regular file.');
    return { target, content: patch.content };
  });

  for (const { target, content } of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });

    // Revalida após criar diretórios, antes de escrever.
    resolveSafePath(root, path.relative(root, target));
    const exists = fs.existsSync(target);
    if (exists && !fs.lstatSync(target).isFile()) throw new Error('Unsafe patch target.');
    const flags = exists ? fs.constants.O_WRONLY | fs.constants.O_TRUNC : fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL;
    const fd = fs.openSync(target, flags | (fs.constants.O_NOFOLLOW ?? 0), 0o666);
    try { fs.writeFileSync(fd, content, 'utf8'); } finally { fs.closeSync(fd); }
  }

  return { applied: patches.length };
}
