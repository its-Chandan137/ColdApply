import { logEvent } from "./log";

/**
 * LLM wrapper: Gemini primary, Groq fallback.
 * - generate() retries Gemini once on 429/5xx/timeout, then falls back to Groq.
 * - embed() uses Gemini embeddings with exponential backoff on rate limits.
 * Every call logs which provider answered.
 */

const TIMEOUT_MS = 45_000;

class ProviderError extends Error {
  constructor(
    public provider: string,
    public status: number | null,
    message: string,
  ) {
    super(`${provider}: ${message}`);
  }
}

function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-2.0-flash";
}

function groqModel(): string {
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}

function isRetryable(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (e instanceof ProviderError) {
    if (e.status === null) return true; // network / timeout
    return e.status === 429 || e.status >= 500;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function postJson(
  provider: string,
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ProviderError(provider, null, `request failed: ${msg}`);
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProviderError(provider, res.status, text.slice(0, 500));
  }
  return res.json();
}

async function callGemini(prompt: string, json: boolean): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ProviderError("gemini", 401, "GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent?key=${encodeURIComponent(key)}`;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };
  if (json) body.generationConfig = { responseMimeType: "application/json" };

  const data = (await postJson("gemini", url, body)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  if (!text) throw new ProviderError("gemini", 502, "empty response");
  return text;
}

async function callGroq(prompt: string, json: boolean): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new ProviderError("groq", 401, "GROQ_API_KEY not set");

  const url = "https://api.groq.com/openai/v1/chat/completions";
  const base = {
    model: groqModel(),
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  };

  try {
    const data = (await postJson(
      "groq",
      url,
      json ? { ...base, response_format: { type: "json_object" } } : base,
      { Authorization: `Bearer ${key}` },
    )) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) throw new ProviderError("groq", 502, "empty response");
    return text;
  } catch (e) {
    // Some Groq models reject response_format - retry once without it.
    if (
      json &&
      e instanceof ProviderError &&
      e.status === 400
    ) {
      const data = (await postJson("groq", url, base, {
        Authorization: `Bearer ${key}`,
      })) as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content ?? "";
    }
    throw e;
  }
}

/** Generate text. Tries Gemini (retry once on 429/5xx/timeout), then Groq. */
export async function generate(
  prompt: string,
  opts: { json?: boolean } = {},
): Promise<string> {
  const json = opts.json ?? false;
  const errors: string[] = [];

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = await callGemini(prompt, json);
      console.log(`[llm] provider=gemini model=${geminiModel()} ok`);
      return out;
    } catch (e) {
      errors.push(String(e instanceof Error ? e.message : e));
      if (!isRetryable(e)) break;
      if (attempt < 2) await sleep(700);
    }
  }

  try {
    const out = await callGroq(prompt, json);
    console.log(`[llm] provider=groq model=${groqModel()} ok (fallback)`);
    await logEvent({
      scope: "llm",
      message: `answered by groq (${groqModel()}) after gemini failure`,
      detail: errors.join("\n"),
    });
    return out;
  } catch (e) {
    errors.push(String(e instanceof Error ? e.message : e));
    const message = `All LLM providers failed: ${errors.join(" | ")}`;
    await logEvent({ level: "error", scope: "llm", message });
    throw new Error(message);
  }
}

/** generate() + robust JSON parsing (strips fences, finds outer braces). */
export async function generateJSON<T>(prompt: string): Promise<T> {
  const raw = await generate(prompt, { json: true });
  return parseJSON<T>(raw);
}

export function parseJSON<T>(raw: string): T {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.search(/[{[]/);
  if (start > 0) s = s.slice(start);
  try {
    return JSON.parse(s) as T;
  } catch {
    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(s.slice(first, last + 1)) as T;
    }
    throw new Error(`LLM returned invalid JSON: ${raw.slice(0, 300)}`);
  }
}

/** Embed a single text with Gemini, backoff on rate limits. */
export async function embed(text: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set (needed for embeddings)");
  const model = process.env.EMBED_MODEL || "models/text-embedding-004";
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:embedContents?key=${encodeURIComponent(key)}`;
  const body = { model, content: { parts: [{ text: text.slice(0, 8000) }] } };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1)); // 1s, 2s, 4s
    try {
      const data = (await postJson("gemini-embed", url, body)) as {
        embeddings?: Array<{ values?: number[] }>;
      };
      const values = data.embeddings?.[0]?.values;
      if (!values || values.length === 0) {
        throw new ProviderError("gemini-embed", 502, "no embedding returned");
      }
      console.log(`[llm] embed ok model=${model} dims=${values.length}`);
      return values;
    } catch (e) {
      lastErr = e;
      if (!isRetryable(e)) break;
    }
  }
  const message = `Embedding failed: ${
    lastErr instanceof Error ? lastErr.message : String(lastErr)
  }`;
  await logEvent({ level: "error", scope: "llm", message });
  throw new Error(message);
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) {
    out.push(await embed(t));
    await sleep(150);
  }
  return out;
}
