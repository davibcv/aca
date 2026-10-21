
import type { Task } from '../types';
import type { AIProvider, Proposal } from './provider';

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function isSafePatchPath(path: string): boolean {
  if (!path.trim() || path.includes("\\") || path.startsWith("/")) {
    return false;
  }

  if (/^[a-zA-Z]:/.test(path)) {
    return false;
  }

  return !path.split("/").some((part) => part === ".." || part === ".");
}

type ParsedProposal = {
  summary?: string;
  patches?: Array<{
    path: string;
    content: string;
  }>;
};

async function getFetch(): Promise<typeof fetch> {
  if (typeof globalThis.fetch !== 'undefined') {
    return globalThis.fetch;
  }

  try {
    const mod = await import('node-fetch');
    return (mod.default ?? mod) as unknown as typeof fetch;
  } catch {
    throw new Error(
      'No fetch available. Install node-fetch or run on Node 18+.'
    );
  }
}

export class GeminiProvider implements AIProvider {
  constructor(
    private apiKey: string,
    private apiUrl?: string,
    private fetchImpl?: typeof fetch
  ) {}

  private getUrl(): string {
    const rawUrl =
      this.apiUrl ||
      process.env.GEMINI_API_URL ||
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new Error('URL da API do Gemini inválida.');
    }

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hash
    ) {
      throw new Error('URL da API do Gemini não é segura.');
    }

    if (url.hostname !== 'generativelanguage.googleapis.com') {
      throw new Error('Host da API do Gemini não autorizado.');
    }

    if (url.searchParams.has('key')) {
      throw new Error('A URL da API não deve conter uma chave API.');
    }

    return url.toString();
  }

  async generateProposal(task: Task): Promise<Proposal> {
    if (!this.apiKey) {
      throw new Error('Missing Gemini API key (GEMINI_API_KEY).');
    }

    const prompt = `Você é um assistente de IA focado em desenvolvimento de software.

Instrução:
Gere uma proposta de alterações de código (patches) no formato JSON estrito para realizar a tarefa abaixo.

Tarefa:
${JSON.stringify(task, null, 2)}

Você DEVE responder UNICAMENTE e EXCLUSIVAMENTE com um objeto JSON válido, sem markdown, sem blocos de código com markdown (como triplas crases), contendo exatamente duas chaves:
1. "summary": um resumo explicativo textual breve das alterações.
2. "patches": um array de objetos onde cada item tem {"path": "caminho/relativo/do/arquivo", "content": "conteúdo completo do arquivo corrigido"}.

Exemplo de resposta esperada:
{
  "summary": "Correção do bug de soma e adição de README",
  "patches": [
    {
      "path": "README.md",
      "content": "# Meu Repositório\\\\nEste projeto está documentado."
    }
  ]
}`;

    try {
      const fetch = this.fetchImpl ?? (await getFetch());
      const requestUrl = new URL(this.getUrl());
      requestUrl.searchParams.set('key', this.apiKey);

      const res = await fetch(requestUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Google API retornou status HTTP ${res.status}.`);
      }

      const data = (await res.json()) as GeminiResponse;
      let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new Error('Formato de resposta inesperado da API do Gemini.');
      }

      textResponse = textResponse.trim();

      if (textResponse.startsWith('```json')) {
        textResponse = textResponse.substring(7);
      }

      if (textResponse.startsWith('```')) {
        textResponse = textResponse.substring(3);
      }

      if (textResponse.endsWith('```')) {
        textResponse = textResponse.substring(0, textResponse.length - 3);
      }

      const parsed = JSON.parse(textResponse.trim()) as ParsedProposal;

      if (
        !parsed ||
        typeof parsed.summary !== 'string' ||
        !Array.isArray(parsed.patches) ||
        !parsed.patches.every(
          (patch) =>
            patch !== null &&
            typeof patch === 'object' &&
            typeof patch.path === 'string' &&
            isSafePatchPath(patch.path) &&
            typeof patch.content === 'string'
        )
      ) {
        throw new Error(
          'A proposta recebida do Gemini possui formato inválido.'
        );
      }

      return {
        summary: parsed.summary,
        patches: parsed.patches
      };
    } catch (err) {
      throw new Error(
        `Falha na requisição ao Provedor Gemini: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}
