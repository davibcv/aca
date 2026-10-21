import type { Task } from '../types';

export type Proposal = {
  summary: string;
  patches: Array<{
    path: string;
    content: string;
  }>;
};

export interface AIProvider {
  generateProposal(task: Task): Promise<Proposal>;
}
