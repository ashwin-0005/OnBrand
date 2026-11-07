import "server-only";
import { createHash } from "node:crypto";
import type { Finding, ReviewResult, Rule, Session } from "@/types";
import { getRepo } from "./repo";
import { runDeterministicChecks } from "./checks";
import { redact } from "./redact";
import { citationGate, locatePhrase } from "./citationGate";
import { AiError, getAiProvider, modelFor, reviewDraft, type AiProvider } from "@/lib/ai";

const NOTICES = {
  mock: "Demo mode: AI findings are saved samples. Rule checks are real.",
  quota: "Free AI quota reached, so these AI findings are saved samples. Rule checks are real. Try again later.",
  unavailable: "The free AI service isn't available right now, so AI findings are saved samples. Rule checks are real.",
  perMinute:
    "Too many AI checks in the last minute, so these AI findings are saved samples. Wait a minute and check again.",
  perDay: (n: number) =>
    `You've used today's ${n} free AI checks, so these AI findings are saved samples. Rule checks are real. More tomorrow.`,
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const limits = () => ({
  perMinute: Number(process.env.RATE_LIMIT_PER_MINUTE) || 5,
  perDay: Number(process.env.RATE_LIMIT_PER_DAY) || 30,
});

/** Same redacted draft + same rule versions + same model => same AI answer. */
export function cacheKey(redactedDraft: string, rules: Rule[], provider: AiProvider): string {
  const ruleSig = rules
    .map((r) => `${r.id}@${r.version}`)
    .sort()
    .join(",");
  return createHash("sha256")
    .update(`${provider}:${modelFor(provider)}\n${ruleSig}\n${redactedDraft.trim()}`)
    .digest("hex");
}

/**
 * Free-tier AI step: mock -> cache -> rate limit -> real provider.
 * Any quota/outage/limit falls back to saved sample findings with a visible notice.
 * Only successful real answers are cached, and cache hits cost no quota.
 */
async function aiStep(
  userId: string,
  redacted: string,
  rules: Rule[],
): Promise<{ findings: Finding[]; notice?: string }> {
  const repo = getRepo();
  const provider = getAiProvider();
  const samples = () => reviewDraft(redacted, rules, "mock");
  if (provider === "mock") return { findings: await samples(), notice: NOTICES.mock };

  const key = cacheKey(redacted, rules, provider);
  const cached = await repo.getCachedAi(key);
  if (cached) return { findings: cached.map((f) => ({ ...f, id: crypto.randomUUID() })) };

  const { perMinute, perDay } = limits();
  const now = Date.now();
  if ((await repo.countAiCalls(userId, new Date(now - 60_000))) >= perMinute)
    return { findings: await samples(), notice: NOTICES.perMinute };
  if ((await repo.countAiCalls(userId, new Date(now - 24 * 60 * 60 * 1000))) >= perDay)
    return { findings: await samples(), notice: NOTICES.perDay(perDay) };

  await repo.recordAiCall(userId);
  try {
    const findings = await reviewDraft(redacted, rules, provider);
    await repo.setCachedAi(key, findings, CACHE_TTL_MS);
    return { findings };
  } catch (e) {
    if (!(e instanceof AiError)) throw e;
    console.warn(`[ai] ${provider} failed (${e.kind}): ${e.message}`);
    return { findings: await samples(), notice: NOTICES[e.kind] };
  }
}

/**
 * The review pipeline (order matters, see CLAUDE.md):
 * rule checks -> redact -> AI (cache / rate limit / mock fallback + notice) -> phrase check -> de-dupe
 * -> citation gate -> save.
 */
export async function runReview(session: Session, text: string): Promise<ReviewResult> {
  const repo = getRepo();
  const ws = session.workspaceId;
  const [rules, termRules] = await Promise.all([repo.getRules(ws), repo.getTermRules(ws)]);

  // 1. Deterministic first.
  const deterministic = runDeterministicChecks(text, termRules);

  // 2. AI second, on redacted text.
  const { findings: ai, notice } = await aiStep(session.user.id, redact(text), rules);

  // 3. Phrases must exist in the original draft (the UI highlights by exact search).
  const located = ai.flatMap((f) => {
    const phrase = locatePhrase(text, f.phrase);
    return phrase ? [{ ...f, phrase }] : [];
  });

  // 4. Rule checks win over AI findings about the same words and rule.
  const overlaps = (a: string, b: string) => a.includes(b) || b.includes(a);
  const aiOnly = located.filter(
    (f) => !deterministic.some((d) => d.rule_id === f.rule_id && overlaps(d.phrase, f.phrase)),
  );

  // 5. Citation gate after every provider.
  const { kept, dropped } = citationGate([...deterministic, ...aiOnly], rules);
  kept.sort((a, b) => text.indexOf(a.phrase) - text.indexOf(b.phrase));

  // 6. Save as a submission + "checked" revision (audit trail).
  const sub = await repo.createSubmission({ workspaceId: ws, authorId: session.user.id, text });
  await repo.saveFindings(sub.id, kept, dropped);
  await repo.addRevision({
    submissionId: sub.id,
    actorId: session.user.id,
    action: "checked",
    detail: `${kept.length} findings cited, ${dropped.length} dropped by the citation gate`,
  });

  return { findings: kept, dropped, submissionId: sub.id, ...(notice ? { notice } : {}) };
}
