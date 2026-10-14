import { AIProvider, Proposal } from './provider';

export class GeminiProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async generateProposal(task: any): Promise<Proposal> {
    if (!this.apiKey) {
      throw new Error('Missing Gemini API key');
    }

    return {
      summary: `Gemini proposal for ${task.id}`,
      patches: []
    };
  }
}
