/**
 * The ONLY place the frontend talks to "the backend".
 * Today every call returns mock data. Set NEXT_PUBLIC_USE_MOCKS="false" later
 * and implement the fetch branches against the real API routes.
 * Never put secrets (e.g. the Claude API key) here: this file runs in the browser.
 */
import type { Finding, ReviewResult, Rule } from "@/types";
import { droppedFindings, findings } from "@/mocks/findings";
import { rules, ruleById } from "@/mocks/rules";
import { mistakesByRule, heatmap, stats } from "@/mocks/insights";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Mock citation gate: keeps only findings whose rule_id exists. */
function citationGate(list: Finding[]): Finding[] {
  return list.filter((f) => ruleById(f.rule_id) !== undefined);
}

export async function checkContent(text: string): Promise<ReviewResult> {
  if (!USE_MOCKS) throw new Error("Real API not connected yet");
  await wait(1600);
  const hits = findings.filter((f) => text.includes(f.phrase));
  return { findings: citationGate(hits), dropped: hits.length ? droppedFindings : [] };
}

export async function getRules(): Promise<Rule[]> {
  if (!USE_MOCKS) throw new Error("Real API not connected yet");
  return rules;
}

export async function getInsights() {
  if (!USE_MOCKS) throw new Error("Real API not connected yet");
  return { stats, mistakesByRule, heatmap };
}
