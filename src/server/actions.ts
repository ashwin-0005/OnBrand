import "server-only";
import type { Comment, Decision, HistoryEvent, InsightRecord, Session } from "@/types";
import { getRepo } from "./repo";
import { HttpError } from "./http";
import { requireRole } from "./auth";
import { displayName } from "./memoryRepo";
import type { z } from "zod";
import type { DecisionBody } from "./schemas";

async function ownSubmission(session: Session, id: string) {
  const sub = await getRepo().getSubmission(session.workspaceId, id);
  if (!sub) throw new HttpError(404, "This review was not found. Run the check again.");
  return sub;
}

/** Accept / edit / dispute. Suggestions only: nothing is applied or published by the server. */
export async function decide(
  session: Session,
  submissionId: string,
  body: z.infer<typeof DecisionBody>,
): Promise<Decision> {
  const repo = getRepo();
  const sub = await ownSubmission(session, submissionId);
  if (sub.status === "approved")
    throw new HttpError(409, "This draft is already approved. Run a new check to change it.");
  const finding = (await repo.getFindings(sub.id)).find((f) => f.id === body.findingId);
  if (!finding) throw new HttpError(404, "That finding is not part of this review.");

  const { state, fix, reason } = body.decision;
  const decision: Decision =
    state === "accepted"
      ? { state, fix: finding.suggested_fix }
      : state === "edited"
        ? { state, fix }
        : { state, reason }; // disputed: reason guaranteed by the schema
  await repo.saveDecision(sub.id, finding.id, decision, session.user.id);
  await repo.addRevision({
    submissionId: sub.id,
    actorId: session.user.id,
    action: state,
    findingId: finding.id,
    detail: state === "disputed" ? reason : (fix ?? finding.suggested_fix),
  });
  return decision;
}

export async function approve(session: Session, submissionId: string) {
  requireRole(session, ["Reviewer", "Admin"], "approve");
  const repo = getRepo();
  const sub = await ownSubmission(session, submissionId);
  if (sub.status === "approved") return { approved: true as const, at: sub.approvedAt!, by: sub.approvedBy! };
  const done = await repo.approve(sub.id, session.user.id);
  await repo.addRevision({ submissionId: sub.id, actorId: session.user.id, action: "approved" });
  return {
    approved: true as const,
    at: done.approvedAt!,
    by: displayName(await repo.listUsers(session.workspaceId), session.user.id),
  };
}

export async function comment(session: Session, submissionId: string, text: string): Promise<Comment> {
  const repo = getRepo();
  const sub = await ownSubmission(session, submissionId);
  const c = await repo.addComment(sub.id, session.user.id, text);
  await repo.addRevision({ submissionId: sub.id, actorId: session.user.id, action: "commented", detail: text });
  return c;
}

export async function comments(session: Session, submissionId: string): Promise<Comment[]> {
  const sub = await ownSubmission(session, submissionId);
  return getRepo().getComments(sub.id);
}

/** Revisions turned into the History tab's plain-language events. */
export async function history(session: Session, submissionId: string): Promise<HistoryEvent[]> {
  const repo = getRepo();
  const sub = await ownSubmission(session, submissionId);
  const [revs, findings, people] = await Promise.all([
    repo.getRevisions(sub.id),
    repo.getFindings(sub.id),
    repo.listUsers(session.workspaceId),
  ]);
  const issue = (id?: string) => findings.find((f) => f.id === id)?.issue ?? "a finding";
  const words: Record<string, (id?: string) => string> = {
    checked: () => "ran a check",
    accepted: (id) => `accepted the fix for “${issue(id)}”`,
    edited: (id) => `edited the fix for “${issue(id)}”`,
    disputed: (id) => `disputed “${issue(id)}”`,
    commented: () => "commented",
    approved: () => "approved the draft",
  };
  return revs.map((r) => ({
    id: r.id,
    at: r.at,
    who: displayName(people, r.actorId),
    what: words[r.action](r.findingId),
    detail: r.detail,
  }));
}

/** Insights with optional server-side filters. Also returns the older summary shapes. */
export async function insights(
  session: Session,
  f: { rule?: string; team?: string; creator?: string; from?: string; to?: string },
) {
  const { stats, records } = await getRepo().getInsights(session.workspaceId);
  const rows = records.filter(
    (r: InsightRecord) =>
      (!f.rule || r.ruleId === f.rule) &&
      (!f.team || r.team === f.team) &&
      (!f.creator || r.creator === f.creator) &&
      (!f.from || r.month >= f.from) &&
      (!f.to || r.month <= f.to),
  );
  const byRule = new Map<string, { count: number; disputed: number }>();
  const heatmap: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const cur = byRule.get(r.ruleId) ?? { count: 0, disputed: 0 };
    byRule.set(r.ruleId, { count: cur.count + r.count, disputed: cur.disputed + r.disputed });
    heatmap[r.team] ??= {};
    heatmap[r.team][r.ruleId] = (heatmap[r.team][r.ruleId] ?? 0) + r.count;
  }
  const mistakesByRule = [...byRule.entries()]
    .map(([ruleId, v]) => ({
      ruleId,
      count: v.count,
      disputedPct: v.count ? Math.round((v.disputed / v.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
  return {
    stats,
    records: rows,
    mistakesByRule,
    heatmap,
    teams: [...new Set(records.map((r) => r.team))],
    creators: [...new Set(records.map((r) => r.creator))],
  };
}

/**
 * Admin-only role change. Refuses to leave a role with nobody in it
 * (there must always be an Admin; demo sign-in also needs one person per role).
 */
export async function changeRole(session: Session, userId: string, role: Session["user"]["role"]) {
  requireRole(session, ["Admin"], "change roles");
  const repo = getRepo();
  const people = await repo.listUsers(session.workspaceId);
  const target = people.find((p) => p.id === userId);
  if (!target) throw new HttpError(404, "User not found.");
  if (target.role !== role && people.filter((p) => p.role === target.role).length === 1)
    throw new HttpError(400, `${target.name} is the only ${target.role}. Give someone else that role first.`);
  return repo.setUserRole(session.workspaceId, userId, role);
}
