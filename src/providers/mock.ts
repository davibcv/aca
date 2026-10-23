import type { Task } from '../types';
import type { AIProvider, Proposal } from './provider';

export class MockProvider implements AIProvider {
  constructor(private customProposal?: Proposal) {}

  async generateProposal(task: Task): Promise<Proposal> {
    if (this.customProposal) {
      return this.customProposal;
    }

    return {
      summary: `Mock proposal for ${task.id}`,
      patches: []
    };
  }
}
