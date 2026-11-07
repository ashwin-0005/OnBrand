export type Role = "Creator" | "Brand manager" | "Reviewer" | "Admin";
export type Severity = "High" | "Medium" | "Low";
export type Category = "Outdated fact" | "Unsupported claim" | "Voice drift" | "Off-brand visual";

export interface Rule {
  id: string; // e.g. "CLM-3.2"
  title: string; // e.g. "Claims Policy 3.2"
  text: string;
  category: Category;
  version: number;
  updatedAt: string;
}

/** Matches the AI finding format in CLAUDE.md, plus UI fields. */
export interface Finding {
  id: string;
  issue: string;
  rule_id: string;
  severity: Severity;
  confidence: number; // 0-1
  explanation: string;
  suggested_fix: string;
  /** Exact phrase in the draft this finding points at. */
  phrase: string;
  source: "deterministic" | "ai";
}

/** A finding the citation gate dropped (rule_id missing or unknown). */
export interface DroppedFinding {
  id: string;
  issue: string;
  claimedRuleId: string | null;
  reason: "no source found";
}

export interface ReviewResult {
  findings: Finding[];
  dropped: DroppedFinding[];
  /** Added by the backend (optional, so the original shape still holds). */
  submissionId?: string;
  /** Visible notice, e.g. when the free AI quota ran out and sample AI findings were used. */
  notice?: string;
}

export interface RuleVersion {
  ruleId: string;
  version: number;
  note: string;
  createdAt: string;
}

export interface Fact {
  id: string;
  label: string;
  value: string;
  validFrom: string;
  source: string;
}

/** Data-driven deterministic check. "banned" removes/replaces a term; "replace" swaps an outdated value. */
export interface TermRule {
  id: string;
  ruleId: string;
  kind: "banned" | "replace";
  term: string;
  replacement: string;
  issue: string;
  severity: Severity;
  explanation: string;
}

export type RevisionAction = "checked" | "accepted" | "edited" | "disputed" | "commented" | "approved";

export interface Submission {
  id: string;
  workspaceId: string;
  authorId: string;
  text: string;
  status: "checked" | "approved";
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Revision {
  id: string;
  submissionId: string;
  actorId: string;
  action: RevisionAction;
  findingId?: string;
  detail?: string;
  at: string;
}

export interface InsightStats {
  findingsThisMonth: number;
  acceptedPct: number;
  disputedPct: number;
  avgReviewMinutes: number;
  repeatErrorPct: number;
}

export interface InsightRecord {
  ruleId: string;
  team: string;
  creator: string;
  month: string;
  count: number;
  disputed: number;
}

export interface Session {
  user: User;
  workspaceId: string;
}

export type DecisionState = "open" | "accepted" | "edited" | "disputed";

export interface Decision {
  state: DecisionState;
  /** Text that replaced the phrase (accepted = suggested fix, edited = user's version). */
  fix?: string;
  /** Required for disputes; logged in history. */
  reason?: string;
}

export interface HistoryEvent {
  id: string;
  at: string;
  who: string;
  what: string;
  detail?: string;
}

export interface Comment {
  id: string;
  at: string;
  who: string;
  text: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  team: string;
}
