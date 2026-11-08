import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  Comment,
  Fact,
  Finding,
  InsightRecord,
  Revision,
  Role,
  Rule,
  RuleVersion,
  Severity,
  Submission,
  TermRule,
  User,
} from "@/types";
import type { Repo } from "./repo";
import { HttpError } from "./http";
import { userClient } from "./mode";

type Row = Record<string, unknown>;
type Res = { data: unknown; error: { message: string; code?: string } | null };

/** Turn database errors into plain-language HTTP errors (details only go to the server log). */
function fail(error: NonNullable<Res["error"]>): never {
  console.error("[supabase]", error.code, error.message);
  if (error.code === "42501") throw new HttpError(403, "You don't have permission to do that.");
  if (error.message.includes("dispute_needs_reason"))
    throw new HttpError(400, "A dispute needs a written reason. Overrides are audited.");
  throw new HttpError(500, "Something went wrong with the database. Please try again.");
}
/** Unwrap a query result (array or object). */
function must<T>(res: Res): T {
  if (res.error) fail(res.error);
  return res.data as T;
}
const rows = (res: Res) => must<Row[]>(res) ?? [];
const isUuidError = (res: Res) => res.error?.code === "22P02";

const toRule = (r: Row): Rule => ({
  id: r.id as string,
  title: r.title as string,
  text: r.text as string,
  category: r.category as Category,
  version: r.version as number,
  updatedAt: r.updated_at as string,
});
const toUser = (r: Row): User => ({
  id: r.user_id as string,
  name: r.name as string,
  team: r.team as string,
  role: r.role as Role,
});
const toSubmission = (r: Row): Submission => ({
  id: r.id as string,
  workspaceId: r.workspace_id as string,
  authorId: r.author_id as string,
  text: r.text as string,
  status: r.status as Submission["status"],
  createdAt: r.created_at as string,
  approvedAt: (r.approved_at as string | null) ?? undefined,
  approvedBy: (r.approved_by as string | null) ?? undefined,
});
const toFinding = (r: Row): Finding => ({
  id: r.id as string,
  issue: r.issue as string,
  rule_id: r.rule_id as string,
  severity: r.severity as Severity,
  confidence: r.confidence as number,
  explanation: r.explanation as string,
  suggested_fix: (r.suggested_fix as string) ?? "",
  phrase: r.phrase as string,
  source: r.source as Finding["source"],
});
const toComment = (r: Row): Comment => {
  const p = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as Row | null;
  return {
    id: r.id as string,
    at: r.created_at as string,
    who: p ? `${p.name} (${p.role})` : "Unknown",
    text: r.text as string,
  };
};
const toRevision = (r: Row): Revision => ({
  id: r.id as string,
  submissionId: r.submission_id as string,
  actorId: r.actor_id as string,
  action: r.action as Revision["action"],
  findingId: (r.finding_id as string | null) ?? undefined,
  detail: (r.detail as string | null) ?? undefined,
  at: r.at as string,
});

const key = (r: Row) => [r.rule_id, r.team, r.creator, r.month].join("|");

/** Postgres-backed repo. `sb` acts as the signed-in user, so row-level security enforces isolation and roles. */
export function createSupabaseRepo(token: string): Repo {
  const sb: SupabaseClient = userClient(token);
  const now = () => new Date().toISOString();

  return {
    async getRules(ws) {
      return rows(await sb.from("rules").select("*").eq("workspace_id", ws).order("id")).map(toRule);
    },
    async getRuleVersions(ws, ruleId) {
      const list = rows(
        await sb
          .from("rule_versions")
          .select("*")
          .eq("workspace_id", ws)
          .eq("rule_id", ruleId)
          .order("version", { ascending: false }),
      );
      if (!list.length) throw new HttpError(404, "Rule not found.");
      return list.map((r): RuleVersion => ({
        ruleId,
        version: r.version as number,
        note: r.note as string,
        createdAt: r.created_at as string,
      }));
    },
    async getFacts(ws) {
      return rows(await sb.from("facts").select("*").eq("workspace_id", ws).order("id")).map((r): Fact => ({
        id: r.id as string,
        label: r.label as string,
        value: r.value as string,
        validFrom: r.valid_from as string,
        source: r.source as string,
      }));
    },
    async getBannedTerms(ws) {
      return rows(await sb.from("banned_terms").select("term").eq("workspace_id", ws).order("term")).map(
        (r) => r.term as string,
      );
    },
    async getTermRules(ws) {
      return rows(await sb.from("term_rules").select("*").eq("workspace_id", ws).order("id")).map((r): TermRule => ({
        id: r.id as string,
        ruleId: r.rule_id as string,
        kind: r.kind as TermRule["kind"],
        term: r.term as string,
        replacement: (r.replacement as string) ?? "",
        issue: r.issue as string,
        severity: r.severity as Severity,
        explanation: r.explanation as string,
      }));
    },

    async listUsers(ws) {
      return rows(await sb.from("profiles").select("*").eq("workspace_id", ws).order("name")).map(toUser);
    },
    async getUserByRole(ws, role) {
      const r = must<Row | null>(
        await sb.from("profiles").select("*").eq("workspace_id", ws).eq("role", role).limit(1).maybeSingle(),
      );
      return r ? toUser(r) : undefined;
    },
    async setUserRole(ws, userId, role) {
      const res = await sb
        .from("profiles")
        .update({ role })
        .eq("user_id", userId)
        .eq("workspace_id", ws)
        .select()
        .maybeSingle();
      if (isUuidError(res)) throw new HttpError(404, "User not found.");
      const r = must<Row | null>(res);
      if (!r) throw new HttpError(403, "You can't change that person's role (or they don't exist).");
      return toUser(r);
    },

    async createSubmission(s) {
      const r = must<Row>(
        await sb
          .from("submissions")
          .insert({ workspace_id: s.workspaceId, author_id: s.authorId, text: s.text })
          .select()
          .single(),
      );
      return toSubmission(r);
    },
    async getSubmission(ws, id) {
      const res = await sb.from("submissions").select("*").eq("id", id).eq("workspace_id", ws).maybeSingle();
      if (isUuidError(res)) return undefined;
      const r = must<Row | null>(res);
      return r ? toSubmission(r) : undefined;
    },
    async saveFindings(sid, findings, dropped) {
      if (findings.length) {
        must(
          await sb.from("findings").insert(
            findings.map((f, position) => ({
              id: f.id,
              submission_id: sid,
              position,
              issue: f.issue,
              rule_id: f.rule_id,
              severity: f.severity,
              confidence: f.confidence,
              explanation: f.explanation,
              suggested_fix: f.suggested_fix,
              phrase: f.phrase,
              source: f.source,
            })),
          ),
        );
      }
      if (dropped.length) {
        must(
          await sb.from("dropped_findings").insert(
            dropped.map((d) => ({
              id: d.id,
              submission_id: sid,
              issue: d.issue,
              claimed_rule_id: d.claimedRuleId,
              reason: d.reason,
            })),
          ),
        );
      }
    },
    async getFindings(sid) {
      return rows(await sb.from("findings").select("*").eq("submission_id", sid).order("position")).map(toFinding);
    },
    async saveDecision(sid, findingId, d, actorId) {
      must(
        await sb.from("decisions").upsert(
          {
            submission_id: sid,
            finding_id: findingId,
            state: d.state,
            fix: d.fix ?? null,
            reason: d.reason ?? null,
            decided_by: actorId,
            decided_at: now(),
          },
          { onConflict: "submission_id,finding_id" },
        ),
      );
      return d;
    },
    async approve(sid, actorId) {
      const r = must<Row | null>(
        await sb
          .from("submissions")
          .update({ status: "approved", approved_at: now(), approved_by: actorId })
          .eq("id", sid)
          .select()
          .maybeSingle(),
      );
      if (!r) throw new HttpError(403, "Only a Reviewer or Admin can approve.");
      return toSubmission(r);
    },
    async addComment(sid, authorId, text) {
      return toComment(
        must<Row>(
          await sb
            .from("comments")
            .insert({ submission_id: sid, author_id: authorId, text })
            .select("id, created_at, text, profiles(name, role)")
            .single(),
        ),
      );
    },
    async getComments(sid) {
      return rows(
        await sb
          .from("comments")
          .select("id, created_at, text, profiles(name, role)")
          .eq("submission_id", sid)
          .order("created_at"),
      ).map(toComment);
    },
    async addRevision(r) {
      return toRevision(
        must<Row>(
          await sb
            .from("revisions")
            .insert({
              submission_id: r.submissionId,
              actor_id: r.actorId,
              action: r.action,
              finding_id: r.findingId ?? null,
              detail: r.detail ?? null,
            })
            .select()
            .single(),
        ),
      );
    },
    async getRevisions(sid) {
      return rows(await sb.from("revisions").select("*").eq("submission_id", sid).order("at")).map(toRevision);
    },

    async getInsights(ws) {
      const cols = "rule_id, team, creator, month, count, accepted, disputed";
      const [hist, live, wsRow] = await Promise.all([
        sb.from("insights_history").select(cols).eq("workspace_id", ws),
        sb.from("live_insights").select(cols).eq("workspace_id", ws),
        sb.from("workspaces").select("synthetic_stats").eq("id", ws).maybeSingle(),
      ]);
      // Synthetic history + live counts from real checks, merged per rule/team/creator/month.
      const merged = new Map<string, { r: Row; count: number; accepted: number; disputed: number }>();
      for (const r of [...rows(hist), ...rows(live)]) {
        const cur = merged.get(key(r)) ?? { r, count: 0, accepted: 0, disputed: 0 };
        cur.count += r.count as number;
        cur.accepted += r.accepted as number;
        cur.disputed += r.disputed as number;
        merged.set(key(r), cur);
      }
      const all = [...merged.values()];
      const records: InsightRecord[] = all.map(({ r, count, disputed }) => ({
        ruleId: r.rule_id as string,
        team: r.team as string,
        creator: r.creator as string,
        month: r.month as string,
        count,
        disputed,
      }));
      const latest = records.reduce((m, r) => (r.month > m ? r.month : m), "");
      const cur = all.filter((x) => x.r.month === latest);
      const total = cur.reduce((s, x) => s + x.count, 0);
      const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
      const syn = (must<Row | null>(wsRow)?.synthetic_stats ?? {}) as Record<string, number>;
      return {
        stats: {
          findingsThisMonth: total,
          acceptedPct: pct(cur.reduce((s, x) => s + x.accepted, 0)),
          disputedPct: pct(cur.reduce((s, x) => s + x.disputed, 0)),
          avgReviewMinutes: syn.avgReviewMinutes ?? 0,
          repeatErrorPct: syn.repeatErrorPct ?? 0,
        },
        records,
      };
    },

    async getCachedAi(k) {
      const r = must<Row | null>(
        await sb.from("review_cache").select("findings").eq("key", k).gt("expires_at", now()).maybeSingle(),
      );
      return r ? (r.findings as Finding[]) : undefined;
    },
    async setCachedAi(k, findings, ttlMs) {
      await sb.from("review_cache").delete().lt("expires_at", now()); // tidy expired rows (own workspace only, via RLS)
      must(
        await sb
          .from("review_cache")
          .upsert({ key: k, findings, expires_at: new Date(Date.now() + ttlMs).toISOString() }, { onConflict: "key" }),
      );
    },
    async countAiCalls(userId, since) {
      const res = await sb
        .from("ai_calls")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("at", since.toISOString());
      if (res.error) fail(res.error);
      return res.count ?? 0;
    },
    async recordAiCall(userId) {
      must(await sb.from("ai_calls").insert({ user_id: userId }));
      await sb
        .from("ai_calls")
        .delete()
        .eq("user_id", userId)
        .lt("at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());
    },
  };
}
