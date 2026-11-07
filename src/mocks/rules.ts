import type { Rule } from "@/types";

export const rules: Rule[] = [
  {
    id: "CLM-3.2",
    title: "Claims Policy 3.2",
    category: "Unsupported claim",
    version: 4,
    updatedAt: "2026-09-12",
    text: 'Do not use superlatives such as "best", "#1" or "fastest" unless a current, cited benchmark supports them.',
  },
  {
    id: "CLM-3.4",
    title: "Claims Policy 3.4",
    category: "Unsupported claim",
    version: 2,
    updatedAt: "2026-06-01",
    text: 'Never promise outcomes. Words like "guaranteed" are not allowed.',
  },
  {
    id: "CLM-4.1",
    title: "Claims Policy 4.1",
    category: "Unsupported claim",
    version: 1,
    updatedAt: "2026-02-20",
    text: 'No medical or scientific claims such as "clinically proven".',
  },
  {
    id: "FCT-1.1",
    title: "Facts Register 1.1",
    category: "Outdated fact",
    version: 7,
    updatedAt: "2026-01-15",
    text: "Prices must match the current price list. Pro plan: $9/month.",
  },
  {
    id: "FCT-1.3",
    title: "Facts Register 1.3",
    category: "Outdated fact",
    version: 3,
    updatedAt: "2026-03-30",
    text: 'Do not mention retired features. "Zippy Drive" was replaced by "Offline mode".',
  },
  {
    id: "VOI-2.1",
    title: "Voice Guide 2.1",
    category: "Voice drift",
    version: 5,
    updatedAt: "2026-08-08",
    text: "Friendly and plain. No ALL CAPS. At most one exclamation mark per piece.",
  },
  {
    id: "VIS-5.2",
    title: "Visual Standards 5.2",
    category: "Off-brand visual",
    version: 2,
    updatedAt: "2026-05-10",
    text: "Text must have a contrast ratio of at least 4.5:1 against its background.",
  },
  {
    id: "VIS-5.4",
    title: "Visual Standards 5.4",
    category: "Off-brand visual",
    version: 1,
    updatedAt: "2026-05-10",
    text: "Every meaningful image needs alt text.",
  },
];

export const ruleById = (id: string): Rule | undefined => rules.find((r) => r.id === id);
