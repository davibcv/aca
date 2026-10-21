export type AppConfig = {
  provider: 'mock' | 'gemini';
  apiKey?: string;
  repoRoot: string;
  branch: string;
};

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawProvider = env.ACA_PROVIDER ?? 'mock';

  if (rawProvider !== 'mock' && rawProvider !== 'gemini') {
    throw new Error(
      `Invalid ACA_PROVIDER "${rawProvider}". Use "mock" or "gemini".`
    );
  }

  return {
    provider: rawProvider,
    apiKey: env.GEMINI_API || env.GEMINI_API_KEY || env.GOOGLE_API_KEY,
    repoRoot: env.ACA_REPO_ROOT || process.cwd(),
    branch: env.ACA_BRANCH || 'feature/phase-2'
  };
}
