export interface AIProvider {
  generateProposal(task: { id: string; description: string }): Promise<{
    summary: string;
    patches: Array<{ path: string; content: string }>;
  }>;
}
