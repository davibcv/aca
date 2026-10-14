import { AIProvider, Proposal } from './provider';

async function getFetch(): Promise<typeof fetch> {
  if (typeof globalThis.fetch !== 'undefined') return globalThis.fetch as unknown as typeof fetch;
  try {
    const mod = await import('node-fetch');
    return (mod.default ?? mod) as unknown as typeof fetch;
  } catch (err) {
    throw new Error('No fetch available. Install node-fetch or run on Node 18+.');
  }
}

export class GeminiProvider implements AIProvider {
  constructor(private apiKey: string, private apiUrl?: string) {}

  private getUrl(): string {
    return this.apiUrl || process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }

  async generateProposal(task: any): Promise<Proposal> {
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
      "content": "# Meu Repositório\nEste projeto está documentado."
    }
  ]
}`;

    const fetch = await getFetch();
    const baseUrl = this.getUrl();
    const urlWithKey = `${baseUrl}?key=${encodeURIComponent(this.apiKey)}`;

    try {
      const res = await fetch(urlWithKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Google API retornou status ${res.status}: ${errorText}`);
      }

      const data = await res.json() as any;

      let textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
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
      textResponse = textResponse.trim();

      const parsed = JSON.parse(textResponse);
      return {
        summary: parsed.summary ?? '',
        patches: Array.isArray(parsed.patches) ? parsed.patches : []
      } as Proposal;

    } catch (err) {
      throw new Error(`Falha na requisição ao Provedor Gemini: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
