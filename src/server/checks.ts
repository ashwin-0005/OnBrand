import "server-only";
import type { Finding, TermRule } from "@/types";

/**
 * DETERMINISTIC FIRST: plain code checks that run before any AI call.
 * Every finding quotes an exact phrase from the draft and cites a rule id.
 */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The sentence (incl. its end punctuation) around position i. */
function sentenceAt(text: string, i: number): { start: number; end: number } {
  let start = i;
  while (start > 0 && !/[.!?\n]/.test(text[start - 1])) start--;
  while (start < i && text[start] === " ") start++;
  let end = i;
  while (end < text.length && !/[.!?\n]/.test(text[end])) end++;
  if (end < text.length && text[end] !== "\n") end++;
  return { start, end };
}

/** Data-driven term rules: outdated values are swapped; banned terms are removed or replaced in their sentence. */
export function termChecks(text: string, rules: TermRule[]): Finding[] {
  const out: Finding[] = [];
  for (const r of rules) {
    const re = new RegExp(escape(r.term), "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const found = m[0];
      if (r.kind === "replace") {
        out.push(base(r, found, r.replacement));
      } else {
        const { start, end } = sentenceAt(text, m.index);
        const sentence = text.slice(start, end);
        const rel = m.index - start;
        let fixed = sentence.slice(0, rel) + r.replacement + sentence.slice(rel + found.length);
        fixed = capitalise(fixed.replace(/\s{2,}/g, " ").trim());
        out.push(base(r, sentence, fixed));
      }
    }
  }
  return out;
}

function base(r: TermRule, phrase: string, fix: string): Finding {
  return {
    id: crypto.randomUUID(),
    issue: r.issue,
    rule_id: r.ruleId,
    severity: r.severity,
    confidence: 0.99,
    explanation: r.explanation,
    suggested_fix: fix,
    phrase,
    source: "deterministic",
  };
}

/** Voice Guide 2.1: no ALL CAPS runs, at most one "!" per piece. */
export function voiceChecks(text: string, voiceRuleId = "VOI-2.1"): Finding[] {
  const out: Finding[] = [];
  const caps = /\b[A-Z]{2,}(?:[ -]+[A-Z]{2,})+\b!*/g;
  let m: RegExpExecArray | null;
  while ((m = caps.exec(text))) {
    const phrase = m[0];
    const fix = capitalise(phrase.toLowerCase()).replace(/!+$/, ".");
    out.push({
      id: crypto.randomUUID(),
      issue: "Voice drift: shouting",
      rule_id: voiceRuleId,
      severity: "Low",
      confidence: 0.95,
      explanation: "ALL CAPS reads as shouting and doesn't match our friendly, plain voice.",
      suggested_fix: fix,
      phrase,
      source: "deterministic",
    });
  }
  const bangs = [...text.matchAll(/!/g)].map((x) => x.index ?? 0);
  if (bangs.length > 1) {
    // Flag the last "word!" that is unique in the text (so the UI highlights the right spot).
    for (let k = bangs.length - 1; k >= 1; k--) {
      const i = bangs[k];
      let s = i;
      while (s > 0 && /\S/.test(text[s - 1])) s--;
      const phrase = text.slice(s, i + 1);
      const alreadyCaps = out.some((f) => f.phrase.includes(phrase) || phrase.includes(f.phrase));
      if (text.indexOf(phrase) === text.lastIndexOf(phrase) && !alreadyCaps) {
        out.push({
          id: crypto.randomUUID(),
          issue: "Voice drift: too many exclamation marks",
          rule_id: voiceRuleId,
          severity: "Low",
          confidence: 0.9,
          explanation: `This piece has ${bangs.length} exclamation marks. Our voice allows at most one.`,
          suggested_fix: phrase.replace(/!$/, "."),
          phrase,
          source: "deterministic",
        });
        break;
      }
    }
  }
  return out;
}

export function runDeterministicChecks(text: string, rules: TermRule[]): Finding[] {
  return [...termChecks(text, rules), ...voiceChecks(text)];
}

/** Escaped regex for a term (exported for redaction/tests). */
export { escape as escapeRegExp };
