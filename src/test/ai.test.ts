// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runReview } from "@/server/review";
import { getSession } from "@/server/auth";
import { DEFAULT_GEMINI_MODEL } from "@/lib/ai";

const env = { ...process.env };
const session = () => getSession(new Request("http://x"));
const draft = "Our app is the #1 fastest in the market. Email ana@zippy.io for Zippy news.";

const geminiReply = (findings: unknown[] | string, status = 200) =>
  new Response(
    status === 200
      ? JSON.stringify({
          candidates: [
            { content: { parts: [{ text: typeof findings === "string" ? findings : JSON.stringify({ findings }) }] } },
          ],
        })
      : JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } }),
    { status },
  );

const good = [
  {
    issue: "Unsupported superlative",
    rule_id: "CLM-3.2",
    severity: "High",
    confidence: 0.9,
    explanation: "Ranking claim without a benchmark.",
    suggested_fix: "Built for speed.",
    phrase: "our app is the #1 fastest in the market.", // wrong case: server relocates it
  },
  {
    issue: "Invented rule",
    rule_id: "MADE-UP-1",
    severity: "Low",
    confidence: 0.5,
    explanation: "x",
    suggested_fix: "",
    phrase: "Zippy",
  },
];

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  (globalThis as { __onbrandRepo?: unknown }).__onbrandRepo = undefined; // fresh store per test
  process.env.AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.MOCK_AI;
  delete process.env.GEMINI_MODEL;
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...env };
});

describe("Gemini provider (free tier, REST)", () => {
  it("sends redacted text + all rules, validates output, and still runs the citation gate", async () => {
    fetchMock.mockResolvedValue(geminiReply(good));
    const res = await runReview(await session(), draft);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`models/${DEFAULT_GEMINI_MODEL}:generateContent`);
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    const body = String(init.body);
    expect(body).toContain("CLM-3.2");
    expect(body).toContain("[EMAIL]");
    expect(body).not.toContain("ana@zippy.io");

    expect(res.notice).toBeUndefined();
    const ai = res.findings.find((f) => f.source === "ai" && f.rule_id === "CLM-3.2");
    expect(ai?.phrase).toBe("Our app is the #1 fastest in the market.");
    expect(res.dropped.map((d) => d.claimedRuleId)).toContain("MADE-UP-1");
  });

  it("falls back to sample findings with a visible notice on quota errors (429)", async () => {
    fetchMock.mockResolvedValue(geminiReply([], 429));
    const res = await runReview(await session(), draft);
    expect(res.notice).toMatch(/quota/i);
    expect(res.findings.some((f) => f.source === "ai")).toBe(true);
  });

  it("falls back with a notice when the model returns invalid JSON", async () => {
    fetchMock.mockResolvedValue(geminiReply("this is not json"));
    const res = await runReview(await session(), draft);
    expect(res.notice).toMatch(/isn't available/);
  });

  it("caches identical checks so they don't use quota again", async () => {
    fetchMock.mockImplementation(async () => geminiReply(good));
    const a = await runReview(await session(), draft);
    const b = await runReview(await session(), draft);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(b.findings.length).toBe(a.findings.length);
    expect(b.findings[0].id).not.toBe(a.findings[0].id); // fresh ids per submission
  });

  it("rate-limits real AI calls per user, falling back to samples with a notice", async () => {
    process.env.RATE_LIMIT_PER_MINUTE = "2";
    fetchMock.mockImplementation(async () => geminiReply(good));
    for (const n of [1, 2]) expect((await runReview(await session(), `${draft} v${n}`)).notice).toBeUndefined();
    const third = await runReview(await session(), `${draft} v3`);
    expect(third.notice).toMatch(/Too many AI checks/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("Ollama provider (local)", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "ollama";
  });

  it("parses a local model answer", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: { content: JSON.stringify({ findings: good }) } })),
    );
    const res = await runReview(await session(), draft);
    expect(String(fetchMock.mock.calls[0][0])).toBe("http://localhost:11434/api/chat");
    expect(res.notice).toBeUndefined();
    expect(res.findings.some((f) => f.source === "ai")).toBe(true);
  });

  it("falls back with a notice when Ollama isn't running", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const res = await runReview(await session(), draft);
    expect(res.notice).toMatch(/isn't available/);
  });
});
