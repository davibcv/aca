export type AppConfig = {
  provider: 'mock' | 'gemini';
  apiKey?: string;
  repoRoot: string;
  branch: string;
};

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    provider: (env.ACA_PROVIDER ?? 'mock') as AppConfig['provider'],
    apiKey: env.GEMINI_API || env.GEMINI_API_KEY || env.GOOGLE_API_KEY,
    repoRoot: env.ACA_REPO_ROOT || process.cwd(),
    branch: env.ACA_BRANCH || 'feature/phase-2'
  };
}
