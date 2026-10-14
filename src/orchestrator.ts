/* src/orchestrator.ts
 *
 * Implementação de runCycle que garante:
 * - em dryRun: percorre discovery -> chama provider -> gera proposta -> NÃO aplica patches
 * - escreve relatório JSON em REPORT_DIR (por defeito: .aca_reports no github.workspace)
 *
 * Nota: este ficheiro tenta integrar com um factory de providers se existir em:
 *   ./providers/providerFactory (exportando createProvider(name, opts) => provider)
 * Se no teu repositório o provider factory usa outro path ou nome, ajusta a importação abaixo.
 *
 * O provider esperado tem um método async propose({files, repoPath, task}): { proposals: [...] }
 * O código inclui um fallback interno (mock) caso não exista providerFactory no projecto.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

export type RunCycleOpts = {
  repoPath?: string; // path to repository root; default: process.cwd()
  reportDir?: string; // directory where reports are written; default: `${process.cwd()}/.aca_reports` or GITHUB_WORKSPACE/.aca_reports
  dryRun?: boolean;
  providerName?: string; // 'mock' or 'gemini' etc.
  maxFiles?: number; // safety cap
  maxFileBytes?: number; // skip files larger than this
  task?: any; // optional task object
};

export type Report = {
  ok: boolean;
  runId: string;
  timestamp: string;
  repoPath: string;
  inspected: string[]; // list of relative file paths inspected
  proposals: any[]; // provider proposals
  applied: boolean; // false in dry-run
  notes?: string[];
  errors?: string[];
};

async function defaultProviderPropose(args: {
  repoPath: string;
  files: { path: string; contentPreview: string }[];
  task?: any;
}) {
  // Simple mock provider: look for 'TODO' or 'FIXME' in previews and propose a noop patch suggestion
  const proposals: any[] = [];
  for (const f of args.files) {
    if (/TODO|FIXME|bug|error/i.test(f.contentPreview)) {
      proposals.push({
        file: f.path,
        summary: "Provider mock suggests review of this location (detected keywords)",
        patch: null,
        confidence: 0.5,
      });
    }
  }
  if (proposals.length === 0) {
    // propose a general suggestion (for demonstration)
    proposals.push({
      file: null,
      summary: "No obvious TODO/FIXME found in preview; no patch proposed by mock",
      patch: null,
      confidence: 0.0,
    });
  }
  return { proposals };
}

/**
 * Discover files under rootPath recursively (sync-safe), skipping common globs.
 * Returns list of absolute file paths (limited by maxFiles and maxFileBytes).
 */
async function discoverFiles(
  rootPath: string,
  maxFiles = 500,
  maxFileBytes = 200 * 1024 // 200 KB
): Promise<string[]> {
  const results: string[] = [];
  const skipNames = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".nyc_output",
    ".cache",
    ".aca_reports",
    "node_modules",
    "coverage",
    "tmp",
    "temp",
  ]);

  async function walk(dir: string) {
    const entries = await readdir(dir);
    for (const name of entries) {
      if (results.length >= maxFiles) return;
      if (skipNames.has(name)) continue;
      const full = path.join(dir, name);
      let st: fs.Stats;
      try {
        st = await stat(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        await walk(full);
      } else if (st.isFile()) {
        if (st.size > maxFileBytes) continue;
        // limit to typical source/text files by extension (simple filter)
        const ext = path.extname(name).toLowerCase();
        const textExts = new Set([
          ".ts",
          ".tsx",
          ".js",
          ".jsx",
          ".json",
          ".md",
          ".py",
          ".java",
          ".go",
          ".rs",
          ".sh",
          ".yml",
          ".yaml",
          ".html",
          ".css",
          ".scss",
        ]);
        if (!textExts.has(ext)) continue;
        results.push(full);
        if (results.length >= maxFiles) return;
      }
    }
  }

  await walk(rootPath);
  return results;
}

async function readPreview(filePath: string, previewBytes = 1024) {
  try {
    const handle = await fs.promises.open(filePath, "r");
    const { buffer } = await handle.read(Buffer.alloc(previewBytes), 0, previewBytes, 0);
    await handle.close();
    // normalize to string and strip binary-looking content
    let s = buffer.toString("utf8").replace(/\0/g, "");
    if (s.length === 0) return "";
    return s;
  } catch {
    return "";
  }
}

async function tryCreateProvider(providerName?: string) {
  // Try to import a provider factory from the repo, fallback to mock provider
  const factoryPaths = [
    path.join(process.cwd(), "src", "providers", "providerFactory"),
    path.join(process.cwd(), "src", "providers", "provider"),
    path.join(process.cwd(), "src", "providers", "mock"),
  ];
  for (const p of factoryPaths) {
    try {
      // dynamic import may require transpiled path - we try to import the TypeScript source via require
      // but when running under node in dist, adapt to dist path if exists
      // prefer requiring compiled JS if present
      let reqPath = p;
      if (fs.existsSync(p + ".js")) reqPath = p + ".js";
      else if (fs.existsSync(p + ".ts")) reqPath = p + ".ts";
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(reqPath);
      if (mod && typeof mod.createProvider === "function") {
        return mod.createProvider;
      }
      // some factories export default
      if (mod && typeof mod.default === "function") {
        return mod.default;
      }
    } catch {
      continue;
    }
  }
  // fallback wrapper to adapt to defaultProviderPropose
  return async function createProviderFallback(name?: string) {
    return {
      async propose(args: { repoPath: string; files: { path: string; contentPreview: string }[]; task?: any }) {
        return defaultProviderPropose(args);
      },
    };
  };
}

/**
 * runCycle: main entry for one run.
 * - discovers files
 * - calls provider.propose(...)
 * - writes report in reportDir
 * - if dryRun === true, DOES NOT apply patches (applied:false)
 */
export async function runCycle(opts: RunCycleOpts = {}): Promise<Report> {
  const repoPath = opts.repoPath || process.env.GITHUB_WORKSPACE || process.cwd();
  const reportDir = opts.reportDir || path.join(repoPath, ".aca_reports") || path.join(process.cwd(), ".aca_reports");
  const dryRun = opts.dryRun !== undefined ? opts.dryRun : true;
  const providerName = opts.providerName || process.env.ACA_PROVIDER || "mock";
  const maxFiles = opts.maxFiles || 500;
  const maxFileBytes = opts.maxFileBytes || 200 * 1024;

  const runId = `run-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const report: Report = {
    ok: false,
    runId,
    timestamp,
    repoPath,
    inspected: [],
    proposals: [],
    applied: false,
    notes: [],
    errors: [],
  };

  try {
    // ensure report dir exists
    await mkdir(reportDir, { recursive: true });

    // discover files
    const discovered = await discoverFiles(repoPath, maxFiles, maxFileBytes);
    // read preview for each file (first N files to avoid huge io)
    const previews: { path: string; contentPreview: string }[] = [];
    for (const f of discovered) {
      const rel = path.relative(repoPath, f);
      // record rel path
      report.inspected.push(rel);
    }

    // read previews (limit to first 200 files)
    const previewLimit = Math.min(report.inspected.length, 200);
    for (let i = 0; i < previewLimit; i++) {
      const abs = path.join(repoPath, report.inspected[i]);
      const preview = await readPreview(abs, 4096);
      previews.push({ path: report.inspected[i], contentPreview: preview });
    }

    // create provider (try project factory, else fallback)
    const createProviderFn = await tryCreateProvider(providerName);
    const provider = await createProviderFn(providerName);

    // call provider propose
    let proposeResult: any;
    try {
      if (provider && typeof provider.propose === "function") {
        proposeResult = await provider.propose({ repo*

