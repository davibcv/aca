import { describe, it, expect } from 'vitest';
import { createCommandVerifier } from '../src/verifier';

describe('createCommandVerifier', () => {
  it('deve retornar ok: true quando o comando executa sem erros', async () => {
    const verifier = createCommandVerifier('node -e "process.exit(0)"');
    const result = await verifier(process.cwd());

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('deve retornar ok: false e capturar a saida de erro quando o comando falha', async () => {
    const verifier = createCommandVerifier('node -e "console.error(\'actual error\"); process.exit(1)"');
    const result = await verifier(process.cwd());

    expect(result.ok).toBe(false);
    expect(result.error).toContain('actual error');
  });
});
