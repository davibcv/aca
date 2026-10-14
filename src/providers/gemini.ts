import { AIProvider, Proposal } from './provider';

async function getFetch(): Promise<typeof fetch> {
  // Prefer global fetch (Node 18+). Fall back to node-fetch if available.
  if (typeof globalThis.fetch !== 'undefined') return globalThis.fetch as unknown as typeof fetch;
  try {
    // dynamic import so this module works even if node-fetch is not installed at runtime
    // (it is a devDependency in package.json but may not be present in some environments)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = await import('node-fetch');
    return (mod.default ?? mod) as unknown as typeof fetch;
  } catch (err) {
    throw new Error(
      'No fetch available. Install node-fetch or run on Node 18+. Alternatively set GEMINI_API_URL to a service that supports simple POSTs.'
    );
  }
}

export class GeminiProvider implements AIProvider {
  constructor(private apiKey: string, private apiUrl?: string) {}

  private getUrl() {
    return this.apiUrl || process.env.GEMINI_API_URL || 'https://api.openai.com/v1/chat/completions';
  }

  async generateProposal(task: any): Promise<Proposal> {
    if (!this.apiKey) {
      throw new Error('Missing Gemini API key (GEMINI_API_KEY).');
    }

    const prompt = `You are an assistant that generates a JSON proposal of code changes (patches) to accomplish a task.\n\nTask:\n${JSON.stringify(
      task,
      null,
      2
    )}\n\nRespond ONLY with a single JSON object with two keys:\n- summary: a short text summary of the proposed changes\n- patches: an array of objects with {"path": "relative/path/to/file", "content": "file contents"}\n\nExample output:\n{\n  "summary": "Fix tests and add README",\n  "patches": [{"path": "README.md", "content": "# README\n..."}]\n}\n\nDo not include explanatory text.`;

    const fetch = await getFetch();
    const url = this.getUrl();

    // Try OpenAI-compatible Chat Completions shape first (common choice).
    try {
      const body = JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body
      });

      if (res.ok) {
        const data = await res.json();
        // OpenAI responses usually have choices[0].message.content
        const text =
          data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? data?.result?.output_text ?? null;

        if (!text) throw new Error('No text content in provider response');

        try {
          const parsed = JSON.parse(text);
          return {
            summary: parsed.summary ?? '',
            patches: Array.isArray(parsed.patches) ? parsed.patches : []
          } as Proposal;
        } catch (err) {
          throw new Error('Provider returned non-JSON or malformed JSON: ' + String(err));
        }
      }

      // If not OK, fall through to try Google-style endpoint below
    } catch (err) {
      // console.debug('OpenAI-style attempt failed:', err);
    }

    // Try Google Generative API style: POST to generativelanguage endpoint using key in query params
    try {
      const isGoogle = url.includes('generativelanguage') || url.includes('googleapis.com');
      let googleUrl = url;
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (isGoogle) {
        // Google uses API key in query param or OAuth; prefer query param with provided API key
        const sep = googleUrl.includes('?') ? '&' : '?';
        googleUrl = `${googleUrl}${sep}key=${encodeURIComponent(this.apiKey)}`;
      } else if (url.includes('api.openai.com')) {
        // shouldn't reach here, but keep header
        headers.Authorization = `Bearer ${this.apiKey}`;
      } else {
        // generic endpoint: try Bearer header
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      const googleBody = JSON.stringify({
        prompt: prompt,
        model: 'text-bison-001',
        // some generative APIs accept "input" or "prompt"; using prompt as fallback
      });

      const res2 = await fetch(googleUrl, {
        method: 'POST',
        headers,
        body: googleBody
      });

      if (!res2.ok) {
        const text = await res2.text().catch(() => '');
        throw new Error(`Provider returned ${res2.status}: ${text}`);
      }

      const d2 = await res2.json().catch(() => null);

      // Google-style responses vary; try to extract text from common fields
      const textOut = d2?.candidates?.[0]?.content ?? d2?.output ?? d2?.result?.output_text ?? JSON.stringify(d2);

      try {
        const parsed = JSON.parse(textOut);
        return {
          summary: parsed.summary ?? '',
          patches: Array.isArray(parsed.patches) ? parsed.patches : []
        } as Proposal;
      } catch (err) {
        throw new Error('Provider returned non-JSON or malformed JSON (google path): ' + String(err));
      }
    } catch (err) {
      throw new Error(
        `Gemini provider request failed: ${err instanceof Error ? err.message : String(err)}.\n` +
          `Set GEMINI_API_KEY (or pass apiKey) and GEMINI_API_URL if needed. The provider attempts OpenAI-style and Google Generative endpoints.`
      );
    }
  }
}
