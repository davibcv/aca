import { readConfig } from './config';
import { runWorkflow } from './workflow';

async function main() {
  const config = readConfig();

  const dry =
    process.env.ACA_DRY_RUN === '1' ||
    process.env.ACA_DRY_RUN === 'true';

  const applyPatches =
    process.env.ACA_APPLY_PATCHES === '1' ||
    process.env.ACA_APPLY_PATCHES === 'true';

  const result = await runWorkflow({
    dryRun: dry,
    applyPatchesMode: applyPatches,
    repoRoot: config.repoRoot
  });

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        summary: result.summary,
        applied: result.applied,
        report: result.reportPath,
        inspected: result.inspected,
        execution: result.execution
      },
      null,
      2
    )
  );

  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
