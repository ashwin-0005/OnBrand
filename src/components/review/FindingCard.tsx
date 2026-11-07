"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Check, Pencil, Flag, Cpu, Sparkles } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import { ConfidenceBar, SourceChip } from "./bits";
import type { Decision, Finding, Rule } from "@/types";

interface Props {
  finding: Finding;
  rule: Rule;
  decision: Decision;
  index: number;
  active: boolean;
  onActive: (id: string | null) => void;
  onAccept: (f: Finding) => void;
  onEdit: (f: Finding, fix: string) => void;
  onDispute: (f: Finding) => void;
  onOpenSource: (r: Rule) => void;
}

const stateLabel: Record<Decision["state"], string> = {
  open: "",
  accepted: "Fix accepted",
  edited: "Edited fix applied",
  disputed: "Disputed",
};

export function FindingCard({
  finding: f,
  rule,
  decision,
  index,
  active,
  onActive,
  onAccept,
  onEdit,
  onDispute,
  onOpenSource,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(f.suggested_fix);
  const decided = decision.state !== "open";
  const titleId = `finding-${f.id}-title`;

  return (
    <motion.article
      id={`finding-${f.id}`}
      tabIndex={-1}
      aria-labelledby={titleId}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.075 }}
      onMouseEnter={() => onActive(f.id)}
      onMouseLeave={() => onActive(null)}
      onFocus={() => onActive(f.id)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && onActive(null)}
      className={`rounded-[var(--radius-card)] bg-white p-5 shadow-sm ring-2 transition-shadow ${active ? "shadow-md ring-ink" : "ring-transparent"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={titleId} className="font-bold">
          {f.issue}
        </h3>
        <SeverityBadge severity={f.severity} />
      </div>
      <p className="mt-1 text-sm text-muted">
        On: <q className="font-medium text-ink">{f.phrase}</q>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <SourceChip rule={rule} onOpen={onOpenSource} />
        <ConfidenceBar value={f.confidence} />
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          {f.source === "ai" ? (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {f.source === "ai" ? "AI finding" : "Rule check"}
        </span>
      </div>
      <p className="mt-3 text-sm">{f.explanation}</p>

      {editing ? (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            onEdit(f, draft.trim());
            setEditing(false);
          }}
        >
          <label htmlFor={`edit-${f.id}`} className="text-xs font-bold uppercase tracking-wider text-green-text">
            Your fix
          </label>
          <textarea
            id={`edit-${f.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            autoFocus
            className="mt-1 w-full rounded-xl bg-fix-green p-3 text-sm ring-1 ring-ink/20"
          />
          <div className="mt-2 flex gap-2">
            <button type="submit" className="min-h-[40px] rounded-full bg-ink px-4 text-sm font-semibold text-white">
              Apply edit
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-[40px] rounded-full px-4 text-sm font-semibold ring-1 ring-ink/20"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 rounded-xl bg-fix-green p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-green-text">Suggested fix</p>
          <p className="mt-0.5 text-sm font-semibold">{decision.state === "edited" ? decision.fix : f.suggested_fix}</p>
        </div>
      )}

      {decided ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold" role="status">
          {decision.state === "disputed" ? (
            <Flag className="h-4 w-4 text-yellow-text" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4 text-green-text" aria-hidden="true" />
          )}
          {stateLabel[decision.state]}
          {decision.reason && <span className="font-normal text-muted">· “{decision.reason}”</span>}
        </p>
      ) : (
        !editing && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAccept(f)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white"
            >
              <Check className="h-4 w-4" aria-hidden="true" /> Accept
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1 ring-ink/20 hover:bg-card-light"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
            </button>
            <button
              type="button"
              onClick={() => onDispute(f)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1 ring-ink/20 hover:bg-card-light"
            >
              <Flag className="h-4 w-4" aria-hidden="true" /> Dispute
            </button>
          </div>
        )
      )}
    </motion.article>
  );
}
