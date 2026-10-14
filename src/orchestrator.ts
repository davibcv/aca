
import fs from 'fs';
import path from 'path';
import { readConfig } from './config';

type InspectionFinding = {
  file: string;
  line: number;
  marker: 'TODO' | 'FIXME';
  text: string;
};

type InspectedFile = {
  path: string;
  sizeBytes: number;
  lines: number;
};

const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.aca_reports',
  '.aca_state'
]);

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.mdx',
  '.yml',
  '.yaml',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.py',
  '.java',
  '.c',
  '.h',
  '.cpp',
  '.hpp',
  '.cs',
  '.go',
  '.rs',
  '.php',
  '.rb',
  '.sh',
  '.bash',
  '.sql',
  '.xml',
  '.toml',
  '.ini',
  '.txt',
  '.gitignore',
  '.editorconfig'
]);

const SPECIAL_TEXT_FILES = new Set([
  'Dockerfile',
  'Makefile',
  'Jenkinsfile',
  'LICENSE',
  'Procfile'
]);

const MAX_FILES = 5000;
const MAX_FINDINGS = 500;

function isTextFile(filePath: string): boolean {
  const basename = path.basename(filePath);

  return (
    TEXT_EXTENSIONS.has(path.extname(basename).toLowerCase()) ||
    SPECIAL_TEXT_FILES.has(basename) ||
    basename.startsWith('.env.example')
  );
}

function isInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);

  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

function inspectRepository(repoRoot: string): {
  files: InspectedFile[];
  findings: InspectionFinding[];
  errors: string[];
  totalBytesRead: number;
  truncated: boolean;
} {
  const root = path.resolve(repoRoot);

  if (!fs.existsSync(root)) {
    throw new Error(`Repository directory does not exist: ${root}`);
  }

  if (!fs.statSync(root).isDirectory()) {
    throw new Error(`Repository path is not a directory: ${root}`);
  }

  const files: InspectedFile[] = [];
  const findings: InspectionFinding[] = [];
  const errors: string[] = [];

  let totalBytesRead = 0;
  let truncated = false;

  function visit(directory: string): void {
    if (truncated) return;

    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      errors.push(
        `Could not list ${path.relative(root, directory) || '.'}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return;
    }

    for (const entry of entries) {
      if (truncated) return;

      const absolutePath = path.resolve(directory, entry.name);

      if (!isInsideRoot(root, absolutePath)) {
        errors.push(
          `Skipped path outside repository root: ${absolutePath}`
        );
        continue;
      }

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          visit(absolutePath);
        }

        continue;
      }

      if (!entry.isFile() || !isTextFile(absolutePath)) {
        continue;
      }

      if (files.length >= MAX_FILES) {
        truncated = true;
        errors.push(
          `Inspection stopped at the safety limit of ${MAX_FILES} files.`
        );
        return;
      }

      const relativePath = path
        .relative(root, absolutePath)
        .split(path.sep)
        .join('/');

      try {
        const content = fs.readFileSync(absolutePath, 'utf8');
        const stat = fs.statSync(absolutePath);

        files.push({
          path: relativePath,
          sizeBytes: stat.size,
          lines: content.length === 0 ? 0 : content.split(/\r\n|\r|\n/).length
        });

        totalBytesRead += Buffer.byteLength(content, 'utf8');

        const lines = content.split(/\r\n|\r|\n/);

        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          const match = line.match(/\b(TODO|FIXME)\b/i);

          if (match) {
            if (findings.length < MAX_FINDINGS) {
              findings.push({
                file: relativePath,
                line: index + 1,
                marker: match[1].toUpperCase() as 'TODO' | 'FIXME',
                text: line.trim().slice(0, 300)
              });
            } else {
              truncated = true;
              errors.push(
                `Finding limit of ${MAX_FINDINGS} reached; inspection results may be incomplete.`
              );
              return;
            }
          }
        }
      } catch (error) {
        errors.push(
          `Could not read ${relativePath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  visit(root);

  files.sort((a, b) => a.path.localeCompare(b.path));

  return {
    files,
    findings,
    errors,
    totalBytesRead,
    truncated
  };
}

export async function runCycle(_opts: { dryRun?: boolean } = {}): Promise<{
  ok: boolean;
  inspected?: string;
  taskId?: string;
  summary?: string;
  applied?: number;
  errors?: string[];
  inspection?: {
    mode: 'read-only';
    repositoryRoot: string;
    filesInspected: number;
    totalBytesRead: number;
    files: InspectedFile[];
    findings: InspectionFinding[];
    truncated: boolean;
  };
}> {
  const config = readConfig();
  const repoRoot = path.resolve(config.repoRoot);

  try {
    const result = inspectRepository(repoRoot);

    const inspectionErrors = result.errors;

    return {
      ok: inspectionErrors.length === 0,
      inspected: `Read-only inspection of ${result.files.length} text files`,
      summary:
        `Inspected ${result.files.length} text files; ` +
        `found ${result.findings.length} TODO/FIXME markers; ` +
        `read ${result.totalBytesRead} bytes.`,
      applied: 0,
      errors: inspectionErrors.length > 0 ? inspectionErrors : undefined,
      inspection: {
        mode: 'read-only',
        repositoryRoot: repoRoot,
        filesInspected: result.files.length,
        totalBytesRead: result.totalBytesRead,
        files: result.files,
        findings: result.findings,
        truncated: result.truncated
      }
    };
  } catch (error) {
    return {
      ok: false,
      inspected: `Inspection failed: ${repoRoot}`,
      summary: 'The repository could not be inspected.',
      applied: 0,
      errors: [
        error instanceof Error ? error.message : String(error)
      ],
      inspection: {
        mode: 'read-only',
        repositoryRoot: repoRoot,
        filesInspected: 0,
        totalBytesRead: 0,
        files: [],
        findings: [],
        truncated: false
      }
    };
  }
}
