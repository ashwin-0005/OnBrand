"use client";

import { useAnimate, useInView } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useReducedMotion } from "@/lib/preferences";
import { SectionHeading } from "./shared";

const stages = ["Content in", "Rule checks", "Retrieval + LLM", "Citation gate", "Human review"];
const STAGE_X = [8, 29, 50, 71, 92]; // % positions
const shards = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2;
  return { x: Math.cos(a) * (30 + (i % 3) * 14), y: Math.sin(a) * (24 + (i % 2) * 16) };
});

export function CitationGateScene() {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const inView = useInView(scope, { amount: 0.5 });
  const running = useRef(false);
  const [done, setDone] = useState(false);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setDone(false);
    const d = reduce ? 0 : 1;
    await Promise.all([
      animate("[data-tok=a]", { left: "4%", backgroundColor: "#ffffff" }, { duration: 0 }),
      animate("[data-tok=b]", { left: "4%", opacity: 1, scale: 1 }, { duration: 0 }),
      animate("[data-shard]", { x: 0, y: 0, opacity: 0 }, { duration: 0 }),
    ]);
    await Promise.all([
      animate("[data-tok=a]", { left: "62%" }, { duration: 2.2 * d, ease: "easeInOut" }),
      animate("[data-tok=b]", { left: "62%" }, { duration: 2.2 * d, ease: "easeInOut", delay: 0.3 * d }),
    ]);
    // The gate: no source -> crumble. Valid source -> pass and turn green.
    animate("[data-tok=b]", { opacity: 0, scale: 0.5 }, { duration: 0.25 * d });
    if (!reduce)
      shards.forEach((s, i) =>
        animate(
          `[data-shard="${i}"]`,
          { x: [0, s.x], y: [0, s.y], opacity: [1, 0] },
          { duration: 0.9, ease: "easeOut" },
        ),
      );
    await animate(
      "[data-tok=a]",
      { left: "84%", backgroundColor: "#3cc29a" },
      { duration: 1.2 * d, ease: "easeInOut", delay: 0.3 * d },
    );
    setDone(true);
    running.current = false;
  }, [animate, reduce]);

  useEffect(() => {
    if (inView) run();
  }, [inView, run]);

  return (
    <section aria-labelledby="gate-title" className="relative py-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="gate-title"
          eyebrow="The citation gate"
          title="Deterministic first, AI second."
          sub="Plain code checks run before any AI. Then every AI finding must cite a rule that really exists in your guidelines. No source, no finding."
        />

        {/* Visual pipeline (decorative; the outcome list below says the same in text) */}
        <div ref={scope} className="relative mt-14 hidden h-64 md:block" aria-hidden="true">
          <div className="absolute left-[4%] right-[4%] top-[62%] h-0.5 bg-white/20" />
          {stages.map((s, i) => (
            <div
              key={s}
              className="absolute top-[62%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${STAGE_X[i]}%` }}
            >
              <span
                className={`h-5 w-5 rounded-full ring-4 ${i === 3 ? "bg-yellow ring-yellow/30" : "bg-white ring-white/15"}`}
              />
              <span className="absolute top-8 whitespace-nowrap text-sm font-semibold text-white/85">{s}</span>
            </div>
          ))}
          {/* The gate itself */}
          <div className="absolute left-[71%] top-[8%] h-[54%] w-1.5 -translate-x-1/2 rounded-full bg-yellow shadow-[0_0_24px_rgba(217,178,95,0.8)]" />

          <span
            data-tok="a"
            className="absolute top-[14%] -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-navy-900 shadow-lg"
            style={{ left: "4%" }}
          >
            ⚑ “#1 fastest” · <span className="font-mono">CLM-3.2</span>
          </span>
          <span
            data-tok="b"
            className="absolute top-[36%] -translate-x-1/2 whitespace-nowrap rounded-full bg-draft-pink px-3 py-1.5 text-sm font-semibold text-navy-900 shadow-lg"
            style={{ left: "4%" }}
          >
            ⚑ “Too salesy?” · no source
          </span>
          {shards.map((_, i) => (
            <span
              key={i}
              data-shard={i}
              className="absolute left-[71%] top-[40%] h-2 w-2 rounded-sm bg-coral opacity-0"
            />
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <ul className="grid gap-3 sm:grid-cols-2" aria-live="polite">
            <li
              className={`flex gap-3 rounded-2xl p-4 transition-colors ${done ? "bg-fix-green text-ink" : "bg-white/5"}`}
            >
              <CheckCircle2
                className={`mt-0.5 h-5 w-5 shrink-0 ${done ? "text-green-text" : "text-white/60"}`}
                aria-hidden="true"
              />
              <span>
                <strong>Finding with a valid source</strong> (Claims Policy 3.2) passes the gate and goes to human
                review.
              </span>
            </li>
            <li
              className={`flex gap-3 rounded-2xl p-4 transition-colors ${done ? "bg-draft-pink text-ink" : "bg-white/5"}`}
            >
              <XCircle
                className={`mt-0.5 h-5 w-5 shrink-0 ${done ? "text-coral-text" : "text-white/60"}`}
                aria-hidden="true"
              />
              <span>
                <strong>Finding without a source</strong> is dropped, and reported as “no source found”.
              </span>
            </li>
          </ul>
          <button
            type="button"
            onClick={run}
            className="hidden min-h-[44px] shrink-0 items-center gap-2 rounded-full px-5 font-semibold ring-1 ring-white/40 hover:bg-white/10 md:inline-flex"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Replay
          </button>
        </div>
      </div>
    </section>
  );
}
