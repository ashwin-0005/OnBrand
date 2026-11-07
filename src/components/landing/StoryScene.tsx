"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Database, FileText } from "lucide-react";
import { ShieldMark } from "@/components/Logo";
import { useReducedMotion } from "@/lib/preferences";

/**
 * 2.5D illustration for the scroll story. `step` 0-5 = Import, Submit, Analyse, Explain, Decide, Approve.
 * Each step adds one thing on top of the previous ones. Decorative: the steps' text carries the meaning.
 */
export function StoryScene({ step }: { step: number }) {
  const reduce = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <div
      className="relative aspect-[4/3] w-full max-w-xl [container-type:inline-size]"
      aria-hidden="true"
      style={{ perspective: 1200 }}
    >
      {/* 1. Knowledge base cube with sheets flying in */}
      <div className="absolute left-[2%] top-[4%] flex w-[26%] flex-col items-center">
        <motion.div
          className="relative grid aspect-square w-full place-items-center rounded-[18%] bg-gradient-to-br from-indigo-600 to-navy-700 ring-1 ring-white/20"
          animate={{ boxShadow: step === 0 ? "0 0 60px rgba(217,178,95,0.7)" : "0 0 18px rgba(217,178,95,0.25)" }}
          style={{ transform: "rotateX(18deg) rotateY(-22deg)" }}
        >
          <Database className="h-[40%] w-[40%] text-white" />
          {step === 0 &&
            !reduce &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute grid h-[38%] w-[30%] place-items-center rounded-md bg-white text-ink shadow-lg"
                initial={{ x: -60 - i * 20, y: -70 + i * 50, rotate: -20 + i * 15, opacity: 0 }}
                animate={{ x: 0, y: 0, rotate: 0, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.4, delay: i * 0.25, repeat: Infinity, repeatDelay: 0.8, ease }}
              >
                <FileText className="h-1/2 w-1/2" />
              </motion.span>
            ))}
        </motion.div>
        <span className="mt-2 text-[clamp(10px,2.6cqw,14px)] font-semibold text-white/85">Knowledge base</span>
      </div>

      {/* Shield */}
      <motion.div
        className="absolute right-[2%] top-[14%] w-[30%]"
        animate={{
          scale: step === 2 ? 1.08 : 1,
          filter: step >= 1 ? "drop-shadow(0 0 30px rgba(224,122,95,0.5))" : "none",
        }}
        transition={{ duration: 0.6 }}
      >
        <ShieldMark className="h-auto w-full" />
      </motion.div>

      {/* 2. Draft card slides toward the shield */}
      <motion.div
        className="absolute left-[4%] top-[42%] w-[60%] overflow-hidden rounded-[6cqw] p-[3.5cqw] text-ink shadow-2xl"
        initial={false}
        animate={{
          x: step >= 1 ? "12%" : "-30%",
          opacity: step >= 1 ? 1 : 0,
          backgroundColor: step >= 5 ? "#def3ea" : "#f6e4df",
        }}
        transition={{ duration: 0.8, ease }}
        style={{ fontSize: "clamp(10px, 3.1cqw, 17px)" }}
      >
        <p className="mb-1 text-[0.75em] font-semibold text-muted">Draft · Social post</p>
        <p className="font-semibold leading-snug">
          Our app is the{" "}
          <Flag on={step >= 3} tag="Claims Policy 3.2">
            #1 fastest
          </Flag>{" "}
          in the market.{" "}
          <Flag on={step >= 3} tag="Claims Policy 3.4">
            Guaranteed
          </Flag>{" "}
          results in 7 days!
        </p>
        {/* 3. Scan beam */}
        <AnimatePresence>
          {step === 2 && (
            <motion.span
              className="pointer-events-none absolute inset-y-0 w-[18%] bg-gradient-to-r from-transparent via-yellow/70 to-transparent"
              initial={{ left: "-20%", opacity: 0 }}
              animate={{ left: reduce ? "40%" : ["-20%", "105%"], opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, repeat: reduce ? 0 : Infinity, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>
        {/* 6. Approved stamp */}
        <AnimatePresence>
          {step >= 5 && (
            <motion.span
              className="absolute right-[4%] top-[8%] rounded-lg border-[0.4cqw] border-green-text px-[1.5cqw] text-[0.8em] font-black uppercase tracking-wider text-green-text"
              initial={{ scale: 2.4, rotate: -24, opacity: 0 }}
              animate={{ scale: 1, rotate: -12, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
            >
              Approved
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 5. Decide buttons */}
      <div className="absolute left-[8%] top-[80%] flex gap-[2cqw]" style={{ fontSize: "clamp(10px, 2.8cqw, 15px)" }}>
        {["Accept", "Edit", "Dispute"].map((b, i) => (
          <motion.span
            key={b}
            className={`rounded-full px-[3cqw] py-[1.2cqw] font-semibold shadow-lg ${i === 0 ? "bg-green text-navy-900" : "bg-white text-ink"}`}
            initial={false}
            animate={{ y: step >= 4 ? 0 : 20, opacity: step >= 4 ? 1 : 0 }}
            transition={{ duration: 0.5, delay: step >= 4 ? i * 0.08 : 0, ease }}
          >
            {b}
          </motion.span>
        ))}
      </div>

      {/* 6. History trail */}
      <ol
        className="absolute right-[2%] top-[60%] w-[30%] space-y-[1.2cqw]"
        style={{ fontSize: "clamp(9px, 2.3cqw, 13px)" }}
      >
        {["Submitted · Priya", "2 findings cited", "Fix accepted", "Approved · Diego"].map((h, i) => (
          <motion.li
            key={h}
            className="flex items-center gap-[1cqw] rounded-md bg-white/10 px-[1.5cqw] py-[0.8cqw] text-white"
            initial={false}
            animate={{ opacity: step >= 5 ? 1 : 0, x: step >= 5 ? 0 : 12 }}
            transition={{ duration: 0.4, delay: step >= 5 ? 0.3 + i * 0.09 : 0 }}
          >
            <Check className="h-[1.1em] w-[1.1em] shrink-0 text-green" /> {h}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/** 4. Coral flag marker on a risky phrase, with its source tag. */
function Flag({ on, tag, children }: { on: boolean; tag: string; children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <motion.span
        className="rounded px-[0.15em]"
        initial={false}
        animate={{ backgroundColor: on ? "rgba(224,122,95,0.35)" : "rgba(224,122,95,0)" }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.span>
      <AnimatePresence>
        {on && (
          <motion.span
            className="absolute -top-[1.9em] left-0 whitespace-nowrap rounded-full bg-coral px-[0.6em] py-[0.1em] font-mono text-[0.62em] font-semibold text-navy-900"
            initial={{ scale: 0, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            ⚑ {tag}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
