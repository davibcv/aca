export type Proposal = {
  summary: string;
  patches: Array<{
    path: string;
    content: string;
  }>;
};

export interface AIProvider {
  generateProposal(task: any): Promise<Proposal>;
}
