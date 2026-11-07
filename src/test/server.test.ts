// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { termChecks, voiceChecks } from "@/server/checks";
import { citationGate, locatePhrase } from "@/server/citationGate";
import { redact } from "@/server/redact";
import { validate, AiError } from "@/lib/ai";
import { runReview } from "@/server/review";
import { approve, decide } from "@/server/actions";
import { getSession } from "@/server/auth";
import { ReviewBody } from "@/server/schemas";
import { POST as decisionsPOST } from "@/app/api/submissions/[id]/decisions/route";
import { POST as reviewPOST } from "@/app/api/review/route";
import { termRules } from "@/mocks/termRules";
import { rules } from "@/mocks/rules";
import { sampleDraft } from "@/content/demo";
import type { Finding, Role } from "@/types";

const asRole = (role: Role) =>
  new Request("http://x/api", { headers: { cookie: `onbrand_demo_role=${encodeURIComponent(role)}` } });
const session = (role: Role = "Creator") => getSession(asRole(role));
const env = { ...process.env };

beforeEach(() => {
  process.env.AI_PROVIDER = "mock";
  delete process.env.MOCK_AI;
});
afterEach(() => {
  process.env = { ...env };
});

describe("Deterministic checks", () => {
  it("swaps outdated values and fixes banned terms in their sentence", () => {
    const f = termChecks(sampleDraft, termRules);
    const by = (rule: string) => f.filter((x) => x.rule_id === rule);
    expect(by("FCT-1.1")[0]).toMatchObject({ phrase: "$5/month", suggested_fix: "$9/month", source: "deterministic" });
    expect(by("FCT-1.3")[0]).toMatchObject({ phrase: "Zippy Drive", suggested_fix: "Offline mode" });
    expect(by("CLM-3.4")[0]).toMatchObject({
      phrase: "Guaranteed results in 7 days!",
      suggested_fix: "Results in 7 days!",
    });
    for (const x of f) expect(sampleDraft).toContain(x.phrase);
  });

  it("flags ALL CAPS and more than one exclamation mark", () => {
    expect(voiceChecks("Nice. AMAZING VALUE!")[0]).toMatchObject({
      phrase: "AMAZING VALUE!",
      suggested_fix: "Amazing value.",
    });
    const bangs = voiceChecks("Great! Really great!");
    expect(bangs).toHaveLength(1);
    expect(bangs[0].phrase).toBe("great!");
    expect(voiceChecks("Calm and plain.")).toHaveLength(0);
  });
});

describe("Citation gate", () => {
  const f = (rule_id: string): Finding => ({
    id: rule_id || "none",
    issue: "x",
    rule_id,
    severity: "Low",
    confidence: 0.5,
    explanation: "",
    suggested_fix: "",
    phrase: "x",
    source: "ai",
  });
  it("keeps findings that cite a real rule and drops the rest as 'no source found'", () => {
    const { kept, dropped } = citationGate([f("CLM-3.2"), f("LEG-9.9"), f("")], rules);
    expect(kept.map((k) => k.rule_id)).toEqual(["CLM-3.2"]);
    expect(dropped).toEqual([
      { id: "LEG-9.9", issue: "x", claimedRuleId: "LEG-9.9", reason: "no source found" },
      { id: "none", issue: "x", claimedRuleId: null, reason: "no source found" },
    ]);
  });
  it("relocates phrases case-insensitively and rejects missing ones", () => {
    expect(locatePhrase("Hello World", "hello world")).toBe("Hello World");
    expect(locatePhrase("Hello", "bye")).toBeNull();
  });
});

describe("AI output validation (zod)", () => {
  it("keeps valid items and skips invalid ones", () => {
    const out = validate({
      findings: [
        {
          issue: "A",
          rule_id: "CLM-3.2",
          severity: "High",
          confidence: 0.9,
          explanation: "e",
          suggested_fix: "f",
          phrase: "p",
        },
        {
          issue: "B",
          rule_id: "CLM-3.2",
          severity: "Extreme",
          confidence: 2,
          explanation: "e",
          suggested_fix: "f",
          phrase: "p",
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ issue: "A", source: "ai" });
  });
  it("throws a typed error for a wrong overall format", () => {
    expect(() => validate("not json")).toThrow(AiError);
  });
});

describe("Privacy", () => {
  it("redacts emails, URLs and phone numbers before AI calls", () => {
    expect(redact("Mail jo@zippy.io or call +44 7700 900123, see https://zippy.io/x")).toBe(
      "Mail [EMAIL] or call [PHONE], see [URL]",
    );
  });
});

describe("Review pipeline", () => {
  it("returns only cited findings with exact phrases, reports dropped ones, and saves a submission", async () => {
    const res = await runReview(await session(), sampleDraft);
    expect(res.submissionId).toBeTruthy();
    expect(res.notice).toMatch(/Demo mode/);
    const known = new Set(rules.map((r) => r.id));
    for (const f of res.findings) {
      expect(known.has(f.rule_id)).toBe(true);
      expect(sampleDraft).toContain(f.phrase);
    }
    expect(res.dropped.map((d) => d.claimedRuleId)).toEqual(expect.arrayContaining(["LEG-9.9", null]));
    // Rule check wins over the AI finding on "AMAZING VALUE!" (same rule, same words)
    expect(res.findings.filter((f) => f.phrase === "AMAZING VALUE!")).toHaveLength(1);
  });

  it("falls back to sample AI findings with a visible notice when the free AI is unavailable", async () => {
    process.env.AI_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;
    const res = await runReview(await session(), sampleDraft);
    expect(res.notice).toMatch(/isn't available/);
    expect(res.findings.some((f) => f.source === "ai")).toBe(true);
  });

  it("caps drafts at 1500 characters", async () => {
    expect(ReviewBody.safeParse({ text: "a".repeat(1501) }).success).toBe(false);
    const res = await reviewPOST(
      new Request("http://x/api/review", { method: "POST", body: JSON.stringify({ text: "a".repeat(1501) }) }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/1500/);
  });
});

describe("Human decisions (server-enforced)", () => {
  it("rejects a dispute without a reason (400) and accepts one with a reason", async () => {
    const res = await runReview(await session(), sampleDraft);
    const id = res.submissionId!;
    const findingId = res.findings[0].id;
    const post = (decision: object) =>
      decisionsPOST(
        new Request(`http://x/api/submissions/${id}/decisions`, {
          method: "POST",
          body: JSON.stringify({ findingId, decision }),
        }),
        { params: Promise.resolve({ id }) } as never,
      );
    const bad = await post({ state: "disputed", reason: "   " });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/reason/);
    const ok = await post({ state: "disputed", reason: "We have a Q2 benchmark." });
    expect(ok.status).toBe(200);
  });

  it("uses the server's suggested fix on accept, and only Reviewer/Admin can approve", async () => {
    const creator = await session("Creator");
    const res = await runReview(creator, sampleDraft);
    const f = res.findings[0];
    const d = await decide(creator, res.submissionId!, {
      findingId: f.id,
      decision: { state: "accepted", fix: "HACKED" },
    });
    expect(d.fix).toBe(f.suggested_fix);
    await expect(approve(creator, res.submissionId!)).rejects.toMatchObject({ status: 403 });
    await expect(approve(await session("Reviewer"), res.submissionId!)).resolves.toMatchObject({ approved: true });
  });
});
