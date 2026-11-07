import "server-only";
import type { Finding, Rule } from "@/types";
import { AiFindingSchema, type AiFinding } from "@/server/schemas";
import { findings as sampleFindings } from "@/mocks/findings";

/**
 * THE ONLY PLACE THE APP CALLS AN AI MODEL. Server-only. Free providers only:
 *   AI_PROVIDER = gemini (default, Google AI Studio free tier) | ollama (local, free) | mock
 *   MOCK_AI=true forces mock regardless of AI_PROVIDER (demo safety net).
 * Every provider must return the same JSON shape; it is validated with zod (AiFindingSchema).
 * The citation gate runs AFTER this, in the review pipeline.
 */

export type AiProvider = "gemini" | "ollama" | "mock";

export class AiError extends Error {
  constructor(
    public kind: "quota" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

export function getAiProvider(): AiProvider {
  if (process.env.MOCK_AI === "true") return "mock";
  const p = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  return p === "ollama" || p === "mock" ? p : "gemini";
}

/** Reviews a (redacted) draft against the workspace rules. Returns zod-validated findings. */
export async function reviewDraft(
  draft: string,
  rules: Rule[],
  provider: AiProvider = getAiProvider(),
): Promise<Finding[]> {
  const raw = await callProvider(provider, draft, rules);
  return validate(raw);
}

/** Free-tier defaults (override with env). gemini-3.5-flash-lite = lightest free Gemini text model (Nov 2026). */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_OLLAMA_MODEL = "llama3.2";
const TIMEOUT_MS = 25_000;

/** Which model a provider uses (also part of the cache key). */
export function modelFor(provider: AiProvider): string {
  if (provider === "gemini") return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  if (provider === "ollama") return process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
  return "samples";
}

async function callProvider(provider: AiProvider, draft: string, rules: Rule[]): Promise<unknown> {
  switch (provider) {
    case "mock":
      return mockProvider(draft);
    case "gemini":
      return gemini(draft, rules);
    case "ollama":
      return ollama(draft, rules);
  }
}

// --- Prompt (same for every provider) ------------------------------------------------------

const SYSTEM = `You review marketing drafts against a company's approved brand rules.
Return ONLY JSON: {"findings":[{"issue":string,"rule_id":string,"severity":"High"|"Medium"|"Low","confidence":number 0-1,"explanation":string,"suggested_fix":string,"phrase":string}]}.
Rules you must follow:
- Cite ONLY rule ids from the list provided. If no listed rule supports a concern, leave it out.
- "phrase" must be copied EXACTLY, character for character, from the draft (a few words up to one sentence).
- "suggested_fix" is replacement text for that phrase only, in a friendly, plain voice.
- "explanation" is one or two short sentences in plain language.
- Placeholders like [EMAIL] or [URL] are redacted private data: ignore them.
- If the draft follows all rules, return {"findings":[]}.`;

export function buildPrompt(draft: string, rules: Rule[]): string {
  const list = rules.map((r) => `- ${r.id} (${r.title}): ${r.text}`).join("\n");
  return `BRAND RULES:\n${list}\n\nDRAFT:\n"""\n${draft}\n"""`;
}

/** Parse model text as JSON (tolerates ```json fences). */
function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AiError("unavailable", "The AI returned text that is not valid JSON.");
  }
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    throw new AiError("unavailable", timeout ? "The AI took too long to answer." : "Could not reach the AI service.");
  }
}

// --- Gemini (Google AI Studio free tier, plain REST, no SDK) -----------------------------------

async function gemini(draft: string, rules: Rule[]): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("unavailable", "No free Gemini API key is configured.");
  const model = modelFor("gemini");
  const res = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: buildPrompt(draft, rules) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 2048 },
    },
    { "x-goog-api-key": key },
  );
  if (res.status === 429) throw new AiError("quota", "Gemini free-tier quota reached.");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (/RESOURCE_EXHAUSTED|quota/i.test(detail)) throw new AiError("quota", "Gemini free-tier quota reached.");
    throw new AiError(
      "unavailable",
      `Gemini error ${res.status}${res.status === 404 ? ` (model "${model}" not found, check GEMINI_MODEL)` : ""}.`,
    );
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new AiError("unavailable", "Gemini returned an empty answer.");
  return parseJson(text);
}

// --- Ollama (local, free; local development only) ---------------------------------------------

async function ollama(draft: string, rules: Rule[]): Promise<unknown> {
  const base = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
  const res = await post(`${base}/api/chat`, {
    model: modelFor("ollama"),
    stream: false,
    format: "json",
    options: { temperature: 0.2 },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: buildPrompt(draft, rules) },
    ],
  });
  if (!res.ok) throw new AiError("unavailable", `Ollama error ${res.status} (is the model pulled?).`);
  const data = (await res.json()) as { message?: { content?: string } };
  return parseJson(data.message?.content ?? "");
}

/** Accepts {findings:[...]} or a bare array; keeps only items that pass the schema. */
export function validate(raw: unknown): Finding[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { findings?: unknown }).findings)
      ? (raw as { findings: unknown[] }).findings
      : null;
  if (!list) throw new AiError("unavailable", "The AI returned an unexpected format.");
  const out: Finding[] = [];
  for (const item of list) {
    const r = AiFindingSchema.safeParse(item);
    if (r.success) out.push(toFinding(r.data));
  }
  return out;
}

const toFinding = (f: AiFinding): Finding => ({ ...f, id: crypto.randomUUID(), source: "ai" });

/**
 * Mock provider: saved sample AI findings (demo safety net). Same JSON shape as real providers.
 * Includes one finding without a valid source so the citation gate is visible in demos.
 */
function mockProvider(draft: string): { findings: unknown[] } {
  const lower = draft.toLowerCase();
  const out: unknown[] = sampleFindings
    .filter((f) => f.source === "ai" && lower.includes(f.phrase.toLowerCase()))
    .map(({ issue, rule_id, severity, confidence, explanation, suggested_fix, phrase }) => ({
      issue,
      rule_id,
      severity,
      confidence,
      explanation,
      suggested_fix,
      phrase,
    }));

  // Generic superlative spotting so the mock is useful on any text.
  for (const m of draft.matchAll(/[^.!?\n]*(?<![\w#])(best|#1|number one|fastest|leading)(?!\w)[^.!?\n]*[.!?]?/gi)) {
    const phrase = m[0].trim();
    if (out.some((o) => (o as AiFinding).phrase.toLowerCase() === phrase.toLowerCase())) continue;
    out.push({
      issue: "Unsupported superlative",
      rule_id: "CLM-3.2",
      severity: "High",
      confidence: 0.82,
      explanation: `“${m[1]}” is a ranking claim. Cite a current benchmark or soften it.`,
      suggested_fix: "Built for speed (see our latest benchmark).",
      phrase,
    });
  }

  if (/zippy/i.test(draft)) {
    out.push({
      issue: "Possible trademark conflict with “Zippy”",
      rule_id: "LEG-9.9",
      severity: "Medium",
      confidence: 0.4,
      explanation: "The name may conflict with another trademark.",
      suggested_fix: "",
      phrase: draft.match(/zippy/i)?.[0] ?? "Zippy",
    });
  }
  out.push({
    issue: "Tone may feel too salesy for enterprise buyers",
    rule_id: "",
    severity: "Low",
    confidence: 0.35,
    explanation: "Subjective tone concern with no rule behind it.",
    suggested_fix: "",
    phrase: draft.trim().split(/\s+/).slice(0, 3).join(" "),
  });
  return { findings: out };
}
