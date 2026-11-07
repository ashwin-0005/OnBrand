"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/preferences";

/** Counts up once when visible. Screen readers get the final value only. */
export function CountUp({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!inView || !el) return;
    if (reduce) {
      el.textContent = `${prefix}${value}${suffix}`;
      return;
    }
    const c = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => (el.textContent = `${prefix}${Math.round(v)}${suffix}`),
    });
    return () => c.stop();
  }, [inView, reduce, value, prefix, suffix]);

  return (
    <>
      <span ref={ref} aria-hidden="true">{`${prefix}0${suffix}`}</span>
      <span className="sr-only">{`${prefix}${value}${suffix}`}</span>
    </>
  );
}
