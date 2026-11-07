/**
 * The ONLY place the frontend talks to the backend. Runs in the browser, so it only calls
 * our own server routes (/api/*). No secrets here: AI keys and database keys stay on the server.
 * Return shapes of the original functions (checkContent, getRules, getInsights) are unchanged;
 * new fields are optional additions.
 */
import type {
  Comment,
  Decision,
  Fact,
  HistoryEvent,
  InsightRecord,
  InsightStats,
  ReviewResult,
  Role,
  Rule,
  RuleVersion,
  Session,
  User,
} from "@/types";

/** Error with a plain-language message from the server, safe to show to the user. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status}).`);
  return data as T;
}

const sub = (id: string) => `/api/submissions/${encodeURIComponent(id)}`;

// --- Review -------------------------------------------------------------------------------

/** Runs rule checks + AI + citation gate. Max 1500 characters. */
export const checkContent = (text: string) => call<ReviewResult>("/api/review", { method: "POST", json: { text } });

/** Accept / edit / dispute. A dispute needs `reason` (the server rejects it otherwise). */
export const saveDecision = (submissionId: string, findingId: string, decision: Decision) =>
  call<Decision>(`${sub(submissionId)}/decisions`, { method: "POST", json: { findingId, decision } });

export const getComments = (submissionId: string) => call<Comment[]>(`${sub(submissionId)}/comments`);
export const addComment = (submissionId: string, text: string) =>
  call<Comment>(`${sub(submissionId)}/comments`, { method: "POST", json: { text } });
export const getHistory = (submissionId: string) => call<HistoryEvent[]>(`${sub(submissionId)}/history`);

/** Reviewer/Admin only. Records sign-off; never publishes. */
export const approveSubmission = (submissionId: string) =>
  call<{ approved: true; at: string; by: string }>(`${sub(submissionId)}/approve`, { method: "POST" });

// --- Guidelines ---------------------------------------------------------------------------

export const getRules = () => call<Rule[]>("/api/rules");
export const getRuleVersions = (ruleId: string) =>
  call<RuleVersion[]>(`/api/rules/${encodeURIComponent(ruleId)}/versions`);
export const getFacts = () => call<Fact[]>("/api/facts");
export const getBannedTerms = () => call<string[]>("/api/terms");

// --- Insights -----------------------------------------------------------------------------

export interface InsightsResponse {
  stats: InsightStats;
  mistakesByRule: { ruleId: string; count: number; disputedPct: number }[];
  heatmap: Record<string, Record<string, number>>;
  records: InsightRecord[];
  teams: string[];
  creators: string[];
}
export const getInsights = (
  filters: { rule?: string; team?: string; creator?: string; from?: string; to?: string } = {},
) => {
  const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  return call<InsightsResponse>(`/api/insights${q.size ? `?${q}` : ""}`);
};

// --- People -------------------------------------------------------------------------------

export const getSession = () => call<Session>("/api/session");
/** Demo sign-in by role (until real auth arrives). */
export const signInDemo = (role: Role) => call<Session>("/api/session", { method: "POST", json: { role } });
export const signOut = () => call<{ ok: true }>("/api/session", { method: "DELETE" });
export const listUsers = () => call<User[]>("/api/users");
export const setUserRole = (userId: string, role: Role) =>
  call<User>(`/api/users/${encodeURIComponent(userId)}`, { method: "PATCH", json: { role } });
