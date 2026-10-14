import { AIProvider, Proposal } from './provider';

export class MockProvider implements AIProvider {
  async generateProposal(task: any): Promise<Proposal> {
    return {
      summary: `Mock proposal for ${task.id}`,
      patches: []
    };
  }
}
