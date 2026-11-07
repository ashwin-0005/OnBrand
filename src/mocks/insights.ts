export const stats = {
  findingsThisMonth: 1284,
  acceptedPct: 72,
  disputedPct: 9,
  avgReviewMinutes: 14,
  repeatErrorPct: 18,
};

export const teams = ["Social", "Growth", "Product", "Support"] as const;

/** Findings per rule this month. disputedPct > 25 marks a rule as possibly ambiguous. */
export const mistakesByRule = [
  { ruleId: "CLM-3.2", count: 312, disputedPct: 31 },
  { ruleId: "FCT-1.1", count: 241, disputedPct: 4 },
  { ruleId: "VOI-2.1", count: 198, disputedPct: 27 },
  { ruleId: "CLM-3.4", count: 176, disputedPct: 6 },
  { ruleId: "FCT-1.3", count: 133, disputedPct: 3 },
  { ruleId: "VIS-5.4", count: 121, disputedPct: 2 },
  { ruleId: "VIS-5.2", count: 64, disputedPct: 5 },
  { ruleId: "CLM-4.1", count: 39, disputedPct: 12 },
];

export const creatorByTeam: Record<(typeof teams)[number], string> = {
  Social: "Priya Nair",
  Growth: "Sam Okafor",
  Product: "Ava Chen",
  Support: "Tom Reyes",
};

export interface InsightRecord {
  ruleId: string;
  team: (typeof teams)[number];
  creator: string;
  month: string; // YYYY-MM
  count: number;
  disputed: number;
}

/** heatmap[team][ruleId] = count */
export const heatmap: Record<(typeof teams)[number], Record<string, number>> = {
  Social: {
    "CLM-3.2": 120,
    "FCT-1.1": 40,
    "VOI-2.1": 90,
    "CLM-3.4": 60,
    "FCT-1.3": 20,
    "VIS-5.4": 55,
    "VIS-5.2": 25,
    "CLM-4.1": 10,
  },
  Growth: {
    "CLM-3.2": 110,
    "FCT-1.1": 95,
    "VOI-2.1": 50,
    "CLM-3.4": 80,
    "FCT-1.3": 30,
    "VIS-5.4": 30,
    "VIS-5.2": 20,
    "CLM-4.1": 15,
  },
  Product: {
    "CLM-3.2": 50,
    "FCT-1.1": 70,
    "VOI-2.1": 28,
    "CLM-3.4": 20,
    "FCT-1.3": 70,
    "VIS-5.4": 16,
    "VIS-5.2": 9,
    "CLM-4.1": 4,
  },
  Support: {
    "CLM-3.2": 32,
    "FCT-1.1": 36,
    "VOI-2.1": 30,
    "CLM-3.4": 16,
    "FCT-1.3": 13,
    "VIS-5.4": 20,
    "VIS-5.2": 10,
    "CLM-4.1": 10,
  },
};

const months = [
  ["2026-09", 0.3],
  ["2026-10", 0.3],
  ["2026-11", 0.4],
] as const;

/** Flat rows derived from the heatmap so every filter (rule, team, creator, date) works on the same data. */
export const records: InsightRecord[] = teams.flatMap((team) =>
  Object.entries(heatmap[team]).flatMap(([ruleId, total]) =>
    months.map(([month, share]) => {
      const count = Math.round(total * share);
      const pct = mistakesByRule.find((m) => m.ruleId === ruleId)?.disputedPct ?? 0;
      return { ruleId, team, creator: creatorByTeam[team], month, count, disputed: Math.round((count * pct) / 100) };
    }),
  ),
);

export const AMBIGUOUS_DISPUTE_PCT = 25;
