import { AIProvider } from './provider';

export class GeminiProvider implements AIProvider {
  constructor(private readonly apiKey: string) {}

  async generateProposal(task: { id: string; description: string }): Promise<{
    summary: string;
    patches: Array<{ path: string; content: string }>;
  }> {
    if (!this.apiKey) {
      return {
        summary: `Gemini provider is not configured for ${task.id}.`,
        patches: []
      };
    }

    return {
      summary: `Gemini proposal for ${task.id}: ${task.description}`,
      patches: []
    };
  }
}
