import fs from 'node:fs';
import path from 'node:path';

export type Patch = {
  path: string;
  content: string;
};

export type ApplyPatchesOptions = {
  allowEmpty?: boolean;
  maxShrinkRatio?: number;
};

const DEFAULT_MAX_SHRINK_RATIO = 0.5;

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

export function applyPatches(
  repoRoot: string,
  patches: Patch[],
  opts: ApplyPatchesOptions = {}
) {
  if (!Array.isArray(patches)) throw new Error('Patches must be an array.');
  const root = fs.realpathSync(path.resolve(repoRoot));
  const seen = new Set<string>();
  const maxShrinkRatio = opts.maxShrinkRatio ?? DEFAULT_MAX_SHRINK_RATIO;

  // Pré-validação estrutural, de segurança e integridade
  const targets = patches.map((patch) => {
    if (!patch || typeof patch.path !== 'string' || typeof patch.content !== 'string') {
      throw new Error('Invalid patch structure.');
    }

    if (!opts.allowEmpty && patch.content.trim().length === 0) {
      throw new Error(`[Integridade] Patch vazio rejeitado para: ${patch.path}`);
    }

    const target = resolveSafePath(root, patch.path);
    if (seen.has(target)) throw new Error('Duplicate patch target.');
    seen.add(target);

    if (fs.existsSync(target)) {
      if (!fs.lstatSync(target).isFile()) {
        throw new Error('Patch target is not a regular file.');
      }

      const existingSize = fs.statSync(target).size;
      const newSize = Buffer.byteLength(patch.content, 'utf8');

      // Protege contra amputação acidental se o arquivo original for relevante (> 100 bytes)
      if (existingSize > 100 && newSize < existingSize * maxShrinkRatio) {
        throw new Error(
          `[Integridade] Redução excessiva de conteúdo detectada em ${patch.path} ` +
          `(original: ${existingSize} bytes, novo: ${newSize} bytes).`
        );
      }
    }

    return { target, content: patch.content };
  });

  for (const { target, content } of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });

    resolveSafePath(root, path.relative(root, target));
    const exists = fs.existsSync(target);
    if (exists && !fs.lstatSync(target).isFile()) throw new Error('Unsafe patch target.');
    const flags = exists ? fs.constants.O_WRONLY | fs.constants.O_TRUNC : fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL;
    const fd = fs.openSync(target, flags | (fs.constants.O_NOFOLLOW ?? 0), 0o666);
    try { fs.writeFileSync(fd, content, 'utf8'); } finally { fs.closeSync(fd); }
  }

  return { applied: patches.length };
}
