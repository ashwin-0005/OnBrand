"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SectionHeading } from "./shared";

const before = "Our app is the #1 fastest in the market.";
const after = "Built for speed: 2x faster sync (Benchmark Q2).";

export function BeforeAfterDemo() {
  const [accepted, setAccepted] = useState(false);

  return (
    <section aria-labelledby="demo-title" className="relative py-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="demo-title"
          eyebrow="Try it"
          title="One finding, start to finish."
          sub="Press “Accept fix” to see what a creator sees."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[var(--radius-card)] bg-white p-8 text-ink shadow-2xl">
            <p className="text-sm font-semibold text-muted">Draft · Social post</p>
            <p className="mt-4 min-h-[5rem] font-serif text-2xl font-bold sm:text-3xl">
              <AnimatePresence mode="wait" initial={false}>
                <motion.mark
                  key={accepted ? "after" : "before"}
                  className="rounded-md px-1 text-ink [box-decoration-break:clone]"
                  initial={{ opacity: 0, filter: "blur(6px)", backgroundColor: "rgba(224,122,95,0.35)" }}
                  animate={{
                    opacity: 1,
                    filter: "blur(0px)",
                    backgroundColor: accepted ? "rgba(60,194,154,0.3)" : "rgba(224,122,95,0.35)",
                  }}
                  exit={{ opacity: 0, filter: "blur(6px)" }}
                  transition={{ duration: 0.4, backgroundColor: { duration: 1, delay: 0.3 } }}
                >
                  {accepted ? after : before}
                </motion.mark>
              </AnimatePresence>
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] bg-card-light p-8 text-ink shadow-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-bold">Unsupported superlative</h3>
              <SeverityBadge severity="High" />
            </div>
            <p className="mt-2 text-sm">
              Source:{" "}
              <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs font-semibold">Claims Policy 3.2</span>
              <span className="ml-3 text-muted">Confidence 94%</span>
            </p>
            <p className="mt-4 text-muted">
              “#1 fastest” is a ranking claim, and no benchmark compares us to the whole market.
            </p>
            <div className="mt-4 rounded-2xl bg-fix-green p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-green-text">Suggested fix</p>
              <p className="mt-1 font-semibold">{after}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={accepted}
                onClick={() => setAccepted(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white disabled:opacity-50"
              >
                <Check className="h-4 w-4" aria-hidden="true" /> {accepted ? "Fix accepted" : "Accept fix"}
              </button>
              {accepted && (
                <button
                  type="button"
                  onClick={() => setAccepted(false)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 font-semibold ring-1 ring-ink/30 hover:bg-white"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset demo
                </button>
              )}
            </div>
            <p className="sr-only" aria-live="polite">
              {accepted ? `Fix accepted. Draft now reads: ${after}` : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
