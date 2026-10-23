import { describe, expect, test, vi } from 'vitest';
import { GeminiProvider } from '../src/providers/gemini';
import type { Task } from '../src/types';

const task: Task = {
  id: 'gemini-test',
  repo: '/tmp/test-repo',
  description: 'Testar a geração de propostas'
};

function mockFetch(responseText: string, ok = true, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue({
    ok,
    status,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{ text: responseText }]
        }
      }]
    }),
    text: async () => responseText
  } as Response);
}

describe('GeminiProvider', () => {
  test('aceita uma proposta JSON válida', async () => {
    const fetchMock = mockFetch(JSON.stringify({
      summary: 'Correção de teste',
      patches: [{ path: 'src/example.ts', content: 'const x = 1;' }]
    }));

    const provider = new GeminiProvider(
      'test-key',
      'https://generativelanguage.googleapis.com',
      fetchMock
    );

    const proposal = await provider.generateProposal(task);

    expect(proposal).toEqual({
      summary: 'Correção de teste',
      patches: [{ path: 'src/example.ts', content: 'const x = 1;' }]
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('injeta contexto de arquivos no prompt quando task.files estiver presente', async () => {
    let capturedBody = '';
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      capturedBody = String(init?.body ?? '');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  summary: 'Ajuste com contexto',
                  patches: [{ path: 'src/app.ts', content: 'export const fixed = true;' }]
                })
              }]
            }
          }]
        }),
        text: async () => ''
      } as Response;
    });

    const provider = new GeminiProvider(
      'test-key',
      'https://generativelanguage.googleapis.com',
      fetchMock
    );

    const taskWithFiles: Task = {
      ...task,
      files: [
        {
          path: 'src/app.ts',
          content: 'export const fixed = false;'
        }
      ]
    };

    const proposal = await provider.generateProposal(taskWithFiles);

    expect(proposal.summary).toBe('Ajuste com contexto');
    expect(capturedBody).toContain('=== Início de src/app.ts ===');
    expect(capturedBody).toContain('export const fixed = false;');
    expect(capturedBody).toContain('=== Fim de src/app.ts ===');
  });

  test('rejeita JSON malformado', async () => {
    const provider = new GeminiProvider(
      'test-key',
      'https://generativelanguage.googleapis.com',
      mockFetch('{ inválido')
    );

    await expect(provider.generateProposal(task)).rejects.toThrow(
      'Falha na requisição ao Provedor Gemini'
    );
  });

  test('rejeita propostas com caminhos inseguros', async () => {
    const unsafePaths = [
      '../outside.ts',
      '/tmp/outside.ts',
      'C:/outside.ts',
      '',
      'src/../outside.ts',
      'src/./outside.ts',
      'src\\outside.ts'
    ];

    for (const path of unsafePaths) {
      const provider = new GeminiProvider(
        'test-key',
        'https://generativelanguage.googleapis.com',
        mockFetch(JSON.stringify({
          summary: 'Proposta inválida',
          patches: [{ path, content: 'código' }]
        }))
      );

      await expect(provider.generateProposal(task)).rejects.toThrow(
        'formato inválido'
      );
    }
  });

  test('rejeita respostas sem conteúdo', async () => {
    const provider = new GeminiProvider(
      'test-key',
      'https://generativelanguage.googleapis.com',
      vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [] }),
        text: async () => ''
      } as Response)
    );

    await expect(provider.generateProposal(task)).rejects.toThrow(
      'Formato de resposta inesperado'
    );
  });

  test('rejeita URLs de API inseguras antes de chamar fetch', async () => {
    const unsafeUrls = [
      'http://generativelanguage.googleapis.com/v1beta/models/test:generateContent',
      'https://evil.example/v1beta/models/test:generateContent',
      'https://user:pass@generativelanguage.googleapis.com/v1beta/models/test:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/test:generateContent#fragment',
      'https://generativelanguage.googleapis.com/v1beta/models/test:generateContent?key=existing',
      'not a url'
    ];

    for (const url of unsafeUrls) {
      const fetchMock = mockFetch('{}');
      const provider = new GeminiProvider('test-key', url, fetchMock);

      await expect(provider.generateProposal(task)).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  test('rejeita requisições sem chave API', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const provider = new GeminiProvider(
      '',
      'https://generativelanguage.googleapis.com',
      fetchMock
    );

    await expect(provider.generateProposal(task)).rejects.toThrow(
      'Missing Gemini API key'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
