#!/usr/bin/env node

import { runCycle } from './orchestrator';

async function main() {
  console.log('ACA agent scaffold - running a dry-cycle.');
  try {
    const summary = await runCycle({ dryRun: true });
    console.log('Cycle summary:', summary);
  } catch (err) {
    console.error('Error during cycle:', err);
    process.exit(1);
  }
}

main();
