import type { DroppedFinding, Finding, Rule } from "@/types";

/**
 * CITATION GATE (runs after every provider, and on rule checks too):
 * keep a finding only if its rule_id exists in this workspace's rules.
 * Everything else is dropped and reported as "no source found".
 */
export function citationGate(findings: Finding[], rules: Rule[]): { kept: Finding[]; dropped: DroppedFinding[] } {
  const known = new Set(rules.map((r) => r.id));
  const kept: Finding[] = [];
  const dropped: DroppedFinding[] = [];
  for (const f of findings) {
    if (f.rule_id && known.has(f.rule_id)) kept.push(f);
    else dropped.push({ id: f.id, issue: f.issue, claimedRuleId: f.rule_id || null, reason: "no source found" });
  }
  return { kept, dropped };
}

/**
 * The UI highlights a finding by searching for its exact phrase in the draft.
 * Returns the exact substring from the draft (case-insensitive match allowed), or null if absent.
 */
export function locatePhrase(text: string, phrase: string): string | null {
  const p = phrase.trim();
  if (!p) return null;
  if (text.includes(p)) return p;
  const i = text.toLowerCase().indexOf(p.toLowerCase());
  return i >= 0 ? text.slice(i, i + p.length) : null;
}
