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
