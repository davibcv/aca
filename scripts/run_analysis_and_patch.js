#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

async function main() {
  const repo = path.resolve(process.env.ACA_REPO_ROOT || process.cwd());
  console.log(`[ACA] Executando analise e ciclo no repositorio: ${repo}`);

  const distEntry = path.join(repo, 'dist', 'index.js');
  if (!fs.existsSync(distEntry)) {
    console.error('[ACA] Build ausente. Execute `npm run build` antes de rodar este script.');
    process.exit(1);
  }

  const { runWorkflow } = require(path.join(repo, 'dist', 'workflow.js'));

  const dry = process.env.ACA_DRY_RUN !== '0' && process.env.ACA_DRY_RUN !== 'false';
  const applyPatches = process.env.ACA_APPLY_PATCHES === '1' || process.env.ACA_APPLY_PATCHES === 'true';

  try {
    const result = await runWorkflow({
      repoRoot: repo,
      dryRun: dry,
      applyPatchesMode: applyPatches
    });

    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          summary: result.summary,
          applied: result.applied,
          report: result.reportPath,
          execution: result.execution
        },
        null,
        2
      )
    );

    if (!result.ok) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[ACA] Falha fatal no ciclo:', err);
    process.exit(1);
  }
}

main();
