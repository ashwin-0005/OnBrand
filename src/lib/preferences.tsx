"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MotionConfig } from "motion/react";
import type { Role } from "@/types";

/* Tiny localStorage-backed store; components re-render via useSyncExternalStore. */
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const write = (key: string, value: string | null) => {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
  listeners.forEach((l) => l());
};

/*
 * Product decision: motion is ON by default for every visit, regardless of the OS
 * "reduce motion" setting. Only the visible navbar toggle turns it off (this still satisfies
 * WCAG 2.2.2 Pause, Stop, Hide). The choice lasts for the browser tab session (sessionStorage),
 * so each new visit starts with motion on.
 */
const REDUCE_KEY = "onbrand.reduceMotion";

export function usePreferences() {
  const manualReduce = useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem(REDUCE_KEY) === "true",
    () => false,
  );
  const role = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("onbrand.role") as Role | null,
    () => null,
  );

  return {
    /** True only when the user ticked "Reduce motion" in this session. */
    reduceMotion: manualReduce,
    manualReduce,
    setManualReduce: (v: boolean) => {
      sessionStorage.setItem(REDUCE_KEY, String(v));
      listeners.forEach((l) => l());
    },
    role,
    setRole: (r: Role | null) => write("onbrand.role", r),
  };
}

/** The navbar toggle. Use this everywhere instead of motion's own hook (which follows the OS). */
export function useReducedMotion(): boolean {
  return usePreferences().reduceMotion;
}

/** Mirrors the reduce-motion choice onto <html data-reduce-motion> so CSS can respect it. */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduce);
  }, [reduce]);
  return <MotionConfig reducedMotion={reduce ? "always" : "never"}>{children}</MotionConfig>;
}
