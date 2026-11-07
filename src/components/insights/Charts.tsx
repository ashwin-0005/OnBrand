"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { AlertTriangle, Wand2 } from "lucide-react";
import { CountUp } from "@/components/landing/CountUp";
/** A rule is "possibly ambiguous" when more than this % of its findings are disputed. */
export const AMBIGUOUS_DISPUTE_PCT = 25;

export function StatCard({
  label,
  value,
  suffix = "",
  hint,
}: {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 font-serif text-4xl font-bold">
        <CountUp value={value} suffix={suffix} />
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export interface RuleRow {
  ruleId: string;
  count: number;
  disputedPct: number;
  title?: string;
}

/** Bar chart as a real list (screen readers read each row); bars are decorative. Table toggle lives in the page. */
export function RuleBarChart({ rows }: { rows: RuleRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const [requested, setRequested] = useState<string | null>(null);
  return (
    <>
      <ul className="space-y-3">
        {rows.map((r, i) => {
          const rule = { title: r.title };
          const ambiguous = r.disputedPct > AMBIGUOUS_DISPUTE_PCT;
          return (
            <li key={r.ruleId} className="grid gap-x-4 gap-y-1 sm:grid-cols-[11rem_1fr]">
              <span className="text-sm">
                <span className="font-mono font-semibold">{r.ruleId}</span>{" "}
                <span className="text-muted">{rule?.title}</span>
              </span>
              <span className="flex flex-wrap items-center gap-3">
                <span className="relative h-7 flex-1" aria-hidden="true">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-md bg-indigo-600 shadow-[3px_3px_0_0_var(--navy-700)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.count / max) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.06 }}
                  />
                </span>
                <span className="w-24 text-sm">
                  <strong>{r.count}</strong> <span className="text-muted">· {r.disputedPct}% disp.</span>
                </span>
                {ambiguous && (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="relative inline-flex items-center gap-1 rounded-full bg-yellow px-2.5 py-1 text-xs font-bold text-navy-900">
                      <span
                        className="absolute inset-0 animate-ping rounded-full bg-yellow opacity-40"
                        aria-hidden="true"
                      />
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Possibly ambiguous
                    </span>
                    <button
                      type="button"
                      onClick={() => setRequested(r.ruleId)}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-full px-3 text-xs font-semibold ring-1 ring-ink/20 hover:bg-card-light"
                    >
                      <Wand2 className="h-3.5 w-3.5" aria-hidden="true" /> Suggest rewrite
                    </button>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p role="status" className="mt-3 text-sm text-green-text">
        {requested && `Rewrite suggestion for ${requested} sent to Admins for review (demo).`}
      </p>
    </>
  );
}

export function RuleTable({ rows }: { rows: RuleRow[] }) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Mistakes by rule</caption>
      <thead className="text-muted">
        <tr>
          <th scope="col" className="py-2">
            Rule
          </th>
          <th scope="col">Findings</th>
          <th scope="col">Disputed</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.ruleId} className="border-t border-ink/10">
            <th scope="row" className="py-2 font-normal">
              <span className="font-mono font-semibold">{r.ruleId}</span> {r.title}
            </th>
            <td>{r.count}</td>
            <td>{r.disputedPct}%</td>
            <td>{r.disputedPct > AMBIGUOUS_DISPUTE_PCT ? "Possibly ambiguous" : "OK"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Teams × rules. Numbers are always printed, so colour is never the only signal. */
export function Heatmap({
  teams,
  ruleIds,
  value,
}: {
  teams: readonly string[];
  ruleIds: string[];
  value: (team: string, rule: string) => number;
}) {
  const max = Math.max(1, ...teams.flatMap((t) => ruleIds.map((r) => value(t, r))));
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-1 text-center text-sm">
        <caption className="sr-only">Findings per team and rule</caption>
        <thead>
          <tr>
            <td />
            {ruleIds.map((r) => (
              <th key={r} scope="col" className="pb-1 font-mono text-xs font-semibold text-muted">
                {r}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t}>
              <th scope="row" className="pr-2 text-left font-semibold">
                {t}
              </th>
              {ruleIds.map((r) => {
                const v = value(t, r);
                const k = v / max;
                // Two bands so text always passes 4.5:1: light cells with ink text, dark cells with white text.
                const dark = k >= 0.5;
                const alpha = dark ? 0.86 + (k - 0.5) * 0.28 : 0.06 + k * 0.5;
                return (
                  <td
                    key={r}
                    className="h-10 rounded-lg font-semibold"
                    style={{ backgroundColor: `rgba(61,74,99,${alpha})`, color: dark ? "#fff" : "var(--ink)" }}
                  >
                    {v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
