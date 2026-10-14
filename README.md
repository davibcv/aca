# ACA

ACA is an autonomous coding agent scaffold for Phase 2.

## Overview

This repository contains the foundation for an autonomous coding agent that can:
- receive task definitions,
- validate task records,
- select a provider,
- generate patches,
- apply lightweight local changes,
- run in a passive CI workflow.

## Structure

- `src/state.ts` — persistent task store
- `src/orchestrator.ts` — cycle runner
- `src/patcher.ts` — patch application utilities
- `src/git.ts` — git helper functions
- `src/config.ts` — runtime configuration
- `src/providerFactory.ts` — provider selector
- `src/agent.ts` — orchestration logic
- `src/service.ts` — task service
- `src/validator.ts` — validation
- `src/providers/provider.ts` — AI provider contract
- `src/providers/mock.ts` — mock provider
- `src/providers/gemini.ts` — Gemini provider
- `scripts/run_analysis_and_patch.js` — passive script

## Usage

1. Define a task.
2. Run the agent with a repo root.
3. Validate the generated proposal.
4. Apply the patch.
5. Review git changes.

## Status

Phase 2 scaffold is in progress.
