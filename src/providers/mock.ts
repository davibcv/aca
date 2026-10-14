import { AIProvider } from './provider';

export class MockProvider implements AIProvider {
  async generateProposal(task: { id: string; description: string }): Promise<{
    summary: string;
    patches: Array<{ path: string; content: string }>;
  }> {
    return {
      summary: `Mock proposal for ${task.id}: ${task.description}`,
      patches: [
        {
          path: 'README.md',
          content: `# Mock patch\n\nThis is a sample generated output for task ${task.id}.\n`
        }
      ]
    };
  }
}
