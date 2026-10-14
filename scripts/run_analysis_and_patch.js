#!/usr/bin/env node

const { execSync } = require('child_process');

function run(command) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  } catch (error) {
    const stderr = error && error.stderr ? error.stderr.toString() : '';
    const stdout = error && error.stdout ? error.stdout.toString() : '';
    throw new Error(`${stderr || stdout || String(error)}`);
  }
}

function main() {
  const repo = process.cwd();
  console.log(`ACA analysis scaffold running in ${repo}`);

  try {
    const status = run('git status --short');
    console.log('git status:\n' + (status || '(clean)'));
  } catch (error) {
    console.error('Failed to inspect repo:', error.message);
    process.exit(1);
  }

  console.log('Analysis scaffold ready. Add provider logic here.');
}

main();
