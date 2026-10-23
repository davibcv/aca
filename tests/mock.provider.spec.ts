import { describe, expect, test } from 'vitest';
import { MockProvider } from '../src/providers/mock';
import type { Task } from '../src/types';

describe('MockProvider', () => {
  const task: Task = {
    id: 'mock-test-1',
    repo: '/tmp/repo',
    description: 'Teste mock'
  };

  test('retorna proposta padrão vazia quando nenhum patch é configurado', async () => {
    const provider = new MockProvider();
    const proposal = await provider.generateProposal(task);

    expect(proposal.summary).toBe('Mock proposal for mock-test-1');
    expect(proposal.patches).toEqual([]);
  });

  test('retorna proposta personalizada quando fornecida no construtor', async () => {
    const custom = {
      summary: 'Proposta customizada',
      patches: [{ path: 'test.txt', content: 'hello' }]
    };
    const provider = new MockProvider(custom);
    const proposal = await provider.generateProposal(task);

    expect(proposal).toEqual(custom);
  });
});
