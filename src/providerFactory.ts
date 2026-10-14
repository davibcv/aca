import { AIProvider } from './providers/provider';
import { MockProvider } from './providers/mock';
import { GeminiProvider } from './providers/gemini';
import { readConfig } from './config';

export function createProvider(): AIProvider {
  const config = readConfig();

  if (config.provider === 'gemini') {
    return new GeminiProvider(config.apiKey ?? '');
  }

  return new MockProvider();
}
