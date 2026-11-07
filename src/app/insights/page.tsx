"use client";

import { useMemo, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { StatCard, RuleBarChart, RuleTable, Heatmap, type RuleRow } from "@/components/insights/Charts";
import { records, stats, teams, creatorByTeam } from "@/mocks/insights";
import { rules } from "@/mocks/rules";

const select = "min-h-[44px] w-full rounded-xl bg-white px-3 ring-1 ring-ink/15";

export default function InsightsPage() {
  const [rule, setRule] = useState("all");
  const [team, setTeam] = useState("all");
  const [creator, setCreator] = useState("all");
  const [from, setFrom] = useState("2026-09");
  const [to, setTo] = useState("2026-11");
  const [view, setView] = useState<"chart" | "table">("chart");

  const rows = useMemo(
    () =>
      records.filter(
        (r) =>
          (rule === "all" || r.ruleId === rule) &&
          (team === "all" || r.team === team) &&
          (creator === "all" || r.creator === creator) &&
          r.month >= from &&
          r.month <= to,
      ),
    [rule, team, creator, from, to],
  );

  const byRule: RuleRow[] = useMemo(() => {
    const m = new Map<string, { count: number; disputed: number }>();
    rows.forEach((r) => {
      const cur = m.get(r.ruleId) ?? { count: 0, disputed: 0 };
      m.set(r.ruleId, { count: cur.count + r.count, disputed: cur.disputed + r.disputed });
    });
    return [...m.entries()]
      .map(([ruleId, v]) => ({
        ruleId,
        count: v.count,
        disputedPct: v.count ? Math.round((v.disputed / v.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const ruleIds = rule === "all" ? rules.map((r) => r.id) : [rule];
  const shownTeams = team === "all" ? teams : teams.filter((t) => t === team);
  const cell = (t: string, r: string) =>
    rows.filter((x) => x.team === t && x.ruleId === r).reduce((s, x) => s + x.count, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl font-bold">Insights</h1>
      <p className="mt-2 text-muted">Which rules keep failing, where, and which ones may be unclear. Synthetic data.</p>

      <section aria-label="Key numbers" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Findings this month" value={stats.findingsThisMonth} />
        <StatCard label="Accepted" value={stats.acceptedPct} suffix="%" />
        <StatCard label="Disputed" value={stats.disputedPct} suffix="%" />
        <StatCard label="Average review time" value={stats.avgReviewMinutes} suffix=" min" />
        <StatCard
          label="Repeat-error rate"
          value={stats.repeatErrorPct}
          suffix="%"
          hint="Same rule broken again by the same creator within 30 days"
        />
      </section>

      <form
        aria-label="Filters"
        className="mt-8 grid gap-4 rounded-[var(--radius-card)] bg-card-light p-5 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="text-sm font-semibold">
          Rule
          <select className={select} value={rule} onChange={(e) => setRule(e.target.value)}>
            <option value="all">All rules</option>
            {rules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Team
          <select className={select} value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="all">All teams</option>
            {teams.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Creator
          <select className={select} value={creator} onChange={(e) => setCreator(e.target.value)}>
            <option value="all">All creators</option>
            {Object.values(creatorByTeam).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          From
          <input
            type="month"
            className={select}
            value={from}
            min="2026-09"
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          To
          <input
            type="month"
            className={select}
            value={to}
            min={from}
            max="2026-11"
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </form>

      <section aria-labelledby="by-rule" className="mt-8 rounded-[var(--radius-card)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="by-rule" className="font-serif text-2xl font-bold">
            Mistakes by rule
          </h2>
          <div role="group" aria-label="View" className="flex rounded-full bg-card-light p-1">
            {(["chart", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${view === v ? "bg-white shadow-sm" : "text-muted"}`}
              >
                {v === "chart" ? (
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Table2 className="h-4 w-4" aria-hidden="true" />
                )}
                {v === "chart" ? "Chart" : "Table"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6">
          {byRule.length === 0 ? (
            <p className="text-muted">No findings match these filters.</p>
          ) : view === "chart" ? (
            <RuleBarChart rows={byRule} />
          ) : (
            <RuleTable rows={byRule} />
          )}
        </div>
      </section>

      <section aria-labelledby="heat" className="mt-8 rounded-[var(--radius-card)] bg-white p-6 shadow-sm">
        <h2 id="heat" className="font-serif text-2xl font-bold">
          Teams × rules
        </h2>
        <p className="mt-1 text-sm text-muted">Darker = more findings. Each cell shows the number.</p>
        <div className="mt-5">
          <Heatmap teams={shownTeams} ruleIds={ruleIds} value={cell} />
        </div>
      </section>
    </div>
  );
}
