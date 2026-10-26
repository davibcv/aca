import { exec } from 'child_process';
import { promisify } from 'util';
import type { VerifyFn, VerifyResult } from './runner';

const execAsync = promisify(exec);

export function createCommandVerifier(command: string): VerifyFn {
  return async (repoRoot: string): Promise<VerifyResult> => {
    try {
      await execAsync(command, { cwd: repoRoot });
      return { ok: true };
    } catch (err: any) {
      const stdout = err?.stdout?.toString() ?? '';
      const stderr = err?.stderr?.toString() ?? '';
      const message = err?.message ? String(err.message) : '';
      const parts = [stdout, stderr, message].map((s) => s.trim()).filter(Boolean);
      const combined = parts.join('\n');
      return {
        ok: false,
        error: combined || `Command verification failed: ${command}`
      };
    }
  };
}
