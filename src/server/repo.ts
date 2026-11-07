import "server-only";
import type {
  Comment,
  Decision,
  DroppedFinding,
  Fact,
  Finding,
  InsightRecord,
  InsightStats,
  Revision,
  Role,
  Rule,
  RuleVersion,
  Submission,
  TermRule,
  User,
} from "@/types";
import { createMemoryRepo } from "./memoryRepo";

/**
 * All data access goes through this interface.
 * Phase B1: in-memory store (no accounts needed). Phase B3 adds a Supabase implementation
 * that uses the signed-in user's client so Postgres row-level security applies.
 */
export interface Repo {
  // Workspace data
  getRules(ws: string): Promise<Rule[]>;
  getRuleVersions(ws: string, ruleId: string): Promise<RuleVersion[]>;
  getFacts(ws: string): Promise<Fact[]>;
  getBannedTerms(ws: string): Promise<string[]>;
  getTermRules(ws: string): Promise<TermRule[]>;
  // People
  listUsers(ws: string): Promise<User[]>;
  getUserByRole(ws: string, role: Role): Promise<User | undefined>;
  setUserRole(ws: string, userId: string, role: Role): Promise<User>;
  // Submissions
  createSubmission(s: Omit<Submission, "id" | "createdAt" | "status">): Promise<Submission>;
  getSubmission(ws: string, id: string): Promise<Submission | undefined>;
  saveFindings(submissionId: string, findings: Finding[], dropped: DroppedFinding[]): Promise<void>;
  getFindings(submissionId: string): Promise<Finding[]>;
  saveDecision(submissionId: string, findingId: string, d: Decision, actorId: string): Promise<Decision>;
  approve(submissionId: string, actorId: string): Promise<Submission>;
  addComment(submissionId: string, authorId: string, text: string): Promise<Comment>;
  getComments(submissionId: string): Promise<Comment[]>;
  addRevision(r: Omit<Revision, "id" | "at">): Promise<Revision>;
  getRevisions(submissionId: string): Promise<Revision[]>;
  // Insights
  getInsights(ws: string): Promise<{ stats: InsightStats; records: InsightRecord[] }>;
  // Free-tier protection
  /** Saved AI findings for an identical draft + rules + model (undefined if missing or expired). */
  getCachedAi(key: string): Promise<Finding[] | undefined>;
  setCachedAi(key: string, findings: Finding[], ttlMs: number): Promise<void>;
  /** Number of real AI calls this user made since the given time. */
  countAiCalls(userId: string, since: Date): Promise<number>;
  recordAiCall(userId: string): Promise<void>;
}

const g = globalThis as unknown as { __onbrandRepo?: Repo };

/** Single store per server process (survives dev hot-reloads). */
export function getRepo(): Repo {
  g.__onbrandRepo ??= createMemoryRepo();
  return g.__onbrandRepo;
}
