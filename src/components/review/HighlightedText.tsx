"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Decision, Finding } from "@/types";

type Segment = { text: string; finding?: Finding };

/** Splits the draft into plain text and flagged phrases (first match per finding, no overlaps). */
export function segment(text: string, findings: Finding[]): Segment[] {
  const hits = findings
    .map((f) => ({ f, at: text.indexOf(f.phrase) }))
    .filter((h) => h.at >= 0)
    .sort((a, b) => a.at - b.at);
  const out: Segment[] = [];
  let i = 0;
  for (const { f, at } of hits) {
    if (at < i) continue;
    if (at > i) out.push({ text: text.slice(i, at) });
    out.push({ text: f.phrase, finding: f });
    i = at + f.phrase.length;
  }
  if (i < text.length) out.push({ text: text.slice(i) });
  return out;
}

/** The draft with accepted/edited fixes applied. */
export function applyDecisions(text: string, findings: Finding[], decisions: Record<string, Decision>) {
  return segment(text, findings)
    .map((s) => (s.finding && decisions[s.finding.id]?.fix ? decisions[s.finding.id].fix : s.text))
    .join("");
}

const bg = {
  open: "rgba(224,122,95,0.28)",
  accepted: "rgba(60,194,154,0.28)",
  edited: "rgba(60,194,154,0.28)",
  disputed: "rgba(217,178,95,0.25)",
};

interface Props {
  text: string;
  findings: Finding[];
  decisions: Record<string, Decision>;
  revealed: number;
  activeId: string | null;
  onActive: (id: string | null) => void;
  onSelect: (id: string) => void;
}

/** Draft text with real <mark> highlights. Hover/focus a mark to link it to its finding card. */
export function HighlightedText({ text, findings, decisions, revealed, activeId, onActive, onSelect }: Props) {
  const order = findings.map((f) => f.id);
  return (
    <p className="whitespace-pre-wrap text-lg leading-relaxed">
      {segment(text, findings).map((s, i) => {
        if (!s.finding) return <span key={i}>{s.text}</span>;
        const f = s.finding;
        const d = decisions[f.id] ?? { state: "open" };
        const shown = order.indexOf(f.id) < revealed;
        if (!shown) return <span key={i}>{s.text}</span>;
        const content = d.fix ?? s.text;
        const active = activeId === f.id;
        return (
          <motion.mark
            key={i}
            initial={{
              backgroundColor: "rgba(224,122,95,0.75)",
            }} /* soft coral pulse on reveal, settles to the state colour */
            animate={{
              backgroundColor: bg[d.state],
              boxShadow: active ? "0 0 0 2px var(--ink)" : "0 0 0 0px rgba(0,0,0,0)",
            }}
            transition={{ duration: 0.5 }}
            className={`rounded px-0.5 text-ink [box-decoration-break:clone] ${d.state === "disputed" ? "underline decoration-yellow-text decoration-dashed decoration-2" : ""}`}
          >
            <button
              type="button"
              className="inline cursor-pointer text-left [font:inherit]"
              onMouseEnter={() => onActive(f.id)}
              onMouseLeave={() => onActive(null)}
              onFocus={() => onActive(f.id)}
              onBlur={() => onActive(null)}
              onClick={() => onSelect(f.id)}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={content}
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.25 }}
                >
                  {content}
                </motion.span>
              </AnimatePresence>
              <span className="sr-only">
                {" "}
                (finding: {f.issue}, {d.state})
              </span>
            </button>
          </motion.mark>
        );
      })}
    </p>
  );
}
