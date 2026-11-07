export const facts = [
  { id: "FACT-01", label: "Pro plan price", value: "$9/month", validFrom: "2026-01-15", source: "Price list v7" },
  {
    id: "FACT-02",
    label: "Sync speed",
    value: "2x faster than the 2025 release",
    validFrom: "2026-07-01",
    source: "Benchmark Q2 2026",
  },
  {
    id: "FACT-03",
    label: "Offline storage feature",
    value: "Offline mode (replaced Zippy Drive)",
    validFrom: "2026-03-30",
    source: "Release notes 26.3",
  },
  {
    id: "FACT-04",
    label: "Teams using Zippy Sync",
    value: "12,000+",
    validFrom: "2026-10-01",
    source: "Usage report Oct 2026",
  },
];

export const bannedTerms = ["guaranteed", "clinically proven", "#1", "best ever", "risk-free", "Zippy Drive"];

/** Mock version history per rule (newest first). */
export const versionNotes: Record<string, string[]> = {
  "CLM-3.2": [
    "Added “fastest” to the examples",
    "Benchmarks must be under 12 months old",
    "Allowed superlatives with a cited benchmark",
    "First version",
  ],
  "FCT-1.1": ["Pro price updated to $9/month", "Added annual plan", "Price list moved to Facts Register"],
  "VOI-2.1": ["Limit of one exclamation mark", "No ALL CAPS", "Friendlier wording", "Merged with the old tone guide"],
};
