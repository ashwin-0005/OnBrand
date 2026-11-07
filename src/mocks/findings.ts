import type { DroppedFinding, Finding } from "@/types";

export const sampleDraft =
  "Our app is the #1 fastest in the market. Guaranteed results in 7 days! Upgrade to Pro for only $5/month and keep your files in Zippy Drive. AMAZING VALUE!";

export const findings: Finding[] = [
  {
    id: "f1",
    issue: "Unsupported superlative",
    rule_id: "CLM-3.2",
    severity: "High",
    confidence: 0.94,
    source: "ai",
    phrase: "Our app is the #1 fastest in the market.",
    explanation: '"#1 fastest" is a ranking claim. We have no benchmark that compares us to the whole market.',
    suggested_fix: "Built for speed: 2x faster sync (Benchmark Q2).",
  },
  {
    id: "f2",
    issue: "Promised outcome",
    rule_id: "CLM-3.4",
    severity: "High",
    confidence: 0.99,
    source: "deterministic",
    phrase: "Guaranteed results in 7 days!",
    explanation: '"Guaranteed" is on the banned-terms list. We can\'t promise results.',
    suggested_fix: "Most teams are set up in a day.",
  },
  {
    id: "f3",
    issue: "Outdated price",
    rule_id: "FCT-1.1",
    severity: "Medium",
    confidence: 0.98,
    source: "deterministic",
    phrase: "only $5/month",
    explanation: "The Pro plan has cost $9/month since January 2026.",
    suggested_fix: "$9/month",
  },
  {
    id: "f4",
    issue: "Retired feature",
    rule_id: "FCT-1.3",
    severity: "Medium",
    confidence: 0.97,
    source: "deterministic",
    phrase: "Zippy Drive",
    explanation: "Zippy Drive was retired in March 2026 and replaced by Offline mode.",
    suggested_fix: "Offline mode",
  },
  {
    id: "f5",
    issue: "Voice drift: shouting",
    rule_id: "VOI-2.1",
    severity: "Low",
    confidence: 0.81,
    source: "ai",
    phrase: "AMAZING VALUE!",
    explanation: "All caps and a second exclamation mark don't match our friendly, plain voice.",
    suggested_fix: "Great value.",
  },
];

export const droppedFindings: DroppedFinding[] = [
  { id: "d1", issue: "Tone may feel too salesy for enterprise buyers", claimedRuleId: null, reason: "no source found" },
  { id: "d2", issue: 'Possible trademark conflict with "Zippy"', claimedRuleId: "LEG-9.9", reason: "no source found" },
];
