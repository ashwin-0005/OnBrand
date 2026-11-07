import "server-only";
import type { Comment, Decision, DroppedFinding, Finding, Revision, Submission, User } from "@/types";
import type { Repo } from "./repo";
import { HttpError } from "./http";
import { rules } from "@/mocks/rules";
import { facts, bannedTerms, versionNotes } from "@/mocks/facts";
import { users } from "@/mocks/users";
import { termRules } from "@/mocks/termRules";
import { records, stats } from "@/mocks/insights";

export const DEMO_WORKSPACE = "zippy-apps";

/**
 * In-memory store seeded with the synthetic Zippy Apps brand.
 * Data lives as long as the server process (resets on restart). One workspace only.
 */
export function createMemoryRepo(): Repo {
  const people: User[] = users.map((u) => ({ ...u }));
  const submissions = new Map<string, Submission>();
  const findings = new Map<string, Finding[]>();
  const dropped = new Map<string, DroppedFinding[]>();
  const decisions = new Map<string, Map<string, Decision>>();
  const comments = new Map<string, Comment[]>();
  const revisions = new Map<string, Revision[]>();
  const aiCache = new Map<string, { findings: Finding[]; expires: number }>();
  const aiCalls = new Map<string, number[]>();
  const now = () => new Date().toISOString();
  const id = () => crypto.randomUUID();
  const sameWs = (ws: string) => {
    if (ws !== DEMO_WORKSPACE) throw new HttpError(404, "Workspace not found.");
  };
  const nameOf = (userId: string) => {
    const u = people.find((p) => p.id === userId);
    return u ? `${u.name} (${u.role})` : "Unknown";
  };

  return {
    async getRules(ws) {
      sameWs(ws);
      return rules;
    },
    async getRuleVersions(ws, ruleId) {
      sameWs(ws);
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) throw new HttpError(404, "Rule not found.");
      return Array.from({ length: rule.version }, (_, i) => {
        const v = rule.version - i;
        return {
          ruleId,
          version: v,
          note: versionNotes[ruleId]?.[i] ?? (v === 1 ? "First version" : "Wording clarified"),
          createdAt: i === 0 ? rule.updatedAt : "",
        };
      });
    },
    async getFacts(ws) {
      sameWs(ws);
      return facts;
    },
    async getBannedTerms(ws) {
      sameWs(ws);
      return bannedTerms;
    },
    async getTermRules(ws) {
      sameWs(ws);
      return termRules;
    },
    async listUsers(ws) {
      sameWs(ws);
      return people;
    },
    async getUserByRole(ws, role) {
      sameWs(ws);
      return people.find((p) => p.role === role);
    },
    async setUserRole(ws, userId, role) {
      sameWs(ws);
      const u = people.find((p) => p.id === userId);
      if (!u) throw new HttpError(404, "User not found.");
      u.role = role;
      return u;
    },
    async createSubmission(s) {
      const sub: Submission = { ...s, id: id(), createdAt: now(), status: "checked" };
      submissions.set(sub.id, sub);
      return sub;
    },
    async getSubmission(ws, sid) {
      const s = submissions.get(sid);
      return s && s.workspaceId === ws ? s : undefined;
    },
    async saveFindings(sid, f, d) {
      findings.set(sid, f);
      dropped.set(sid, d);
    },
    async getFindings(sid) {
      return findings.get(sid) ?? [];
    },
    async saveDecision(sid, findingId, d) {
      const map = decisions.get(sid) ?? new Map<string, Decision>();
      map.set(findingId, d);
      decisions.set(sid, map);
      return d;
    },
    async approve(sid, actorId) {
      const s = submissions.get(sid);
      if (!s) throw new HttpError(404, "Submission not found.");
      Object.assign(s, { status: "approved", approvedAt: now(), approvedBy: actorId });
      return s;
    },
    async addComment(sid, authorId, text) {
      const c: Comment = { id: id(), at: now(), who: nameOf(authorId), text };
      comments.set(sid, [...(comments.get(sid) ?? []), c]);
      return c;
    },
    async getComments(sid) {
      return comments.get(sid) ?? [];
    },
    async addRevision(r) {
      const rev: Revision = { ...r, id: id(), at: now() };
      revisions.set(r.submissionId, [...(revisions.get(r.submissionId) ?? []), rev]);
      return rev;
    },
    async getRevisions(sid) {
      return revisions.get(sid) ?? [];
    },
    async getInsights(ws) {
      sameWs(ws);
      return { stats, records };
    },
    async getCachedAi(key) {
      const hit = aiCache.get(key);
      if (!hit) return undefined;
      if (hit.expires < Date.now()) {
        aiCache.delete(key);
        return undefined;
      }
      return hit.findings;
    },
    async setCachedAi(key, f, ttlMs) {
      aiCache.set(key, { findings: f, expires: Date.now() + ttlMs });
    },
    async countAiCalls(userId, since) {
      const t = since.getTime();
      const kept = (aiCalls.get(userId) ?? []).filter((x) => x >= Date.now() - 24 * 60 * 60 * 1000);
      aiCalls.set(userId, kept);
      return kept.filter((x) => x >= t).length;
    },
    async recordAiCall(userId) {
      aiCalls.set(userId, [...(aiCalls.get(userId) ?? []), Date.now()]);
    },
  };
}

/** Display name for history entries. Exported for the history route. */
export function displayName(people: User[], userId: string) {
  const u = people.find((p) => p.id === userId);
  return u ? `${u.name} (${u.role})` : "Unknown";
}
