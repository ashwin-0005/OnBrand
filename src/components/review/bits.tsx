"use client";

import { BookOpen, type LucideIcon } from "lucide-react";
import type { Rule } from "@/types";

/** Confidence as text + a small decorative bar. */
export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-muted">
      Confidence {pct}%
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
        <span className="block h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

/** Cited source; opens the rule text in a drawer. */
export function SourceChip({ rule, onOpen }: { rule: Rule; onOpen: (r: Rule) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(rule)}
      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-ink ring-1 ring-ink/15 hover:ring-ink/40"
    >
      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">Source: </span>
      {rule.title}
      <span className="font-mono text-muted">{rule.id}</span>
    </button>
  );
}

export function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] bg-card-light px-6 py-12 text-center">
      <Icon className="h-10 w-10 text-indigo-600" aria-hidden="true" />
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
    </div>
  );
}
