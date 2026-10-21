import type { Task } from '../types';
import type { AIProvider, Proposal } from './provider';

export class MockProvider implements AIProvider {
  async generateProposal(task: Task): Promise<Proposal> {
    return {
      summary: `Mock proposal for ${task.id}`,
      patches: []
    };
  }
}
