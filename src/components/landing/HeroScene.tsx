"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ShieldMark } from "@/components/Logo";
import { useReducedMotion } from "@/lib/preferences";
import { useInView, usePageVisible } from "@/hooks/useInView";
import { heroDrafts } from "@/mocks/drafts";

/** Static shield + cards: shown while 3D loads, and instead of 3D when motion is reduced. */
function StaticHero({ showCards }: { showCards: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <div className="absolute h-72 w-72 rounded-full bg-coral/25 blur-3xl" />
      <ShieldMark className="relative h-48 w-48 drop-shadow-[0_0_40px_rgba(224,122,95,0.45)] sm:h-64 sm:w-64" />
      {showCards &&
        heroDrafts.slice(0, 3).map((d, i) => (
          <div
            key={d.text}
            className={`absolute max-w-[14rem] rounded-2xl bg-draft-pink px-4 py-3 text-sm font-semibold text-ink shadow-xl ${
              ["left-0 top-[12%] -rotate-3", "right-0 top-[42%] rotate-2", "bottom-[8%] left-[8%] rotate-1"][i]
            }`}
          >
            <span className="block text-xs text-coral-text">⚑ {d.tag}</span>
            {d.text}
          </div>
        ))}
    </div>
  );
}

const HeroCanvas = dynamic(() => import("./HeroCanvas"), {
  ssr: false,
  loading: () => <StaticHero showCards={false} />,
});

const noop = () => () => {};
const isLowPower = () => window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4;

export function HeroScene() {
  const reduce = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>("100px");
  const visible = usePageVisible();
  const lowPower = useSyncExternalStore(noop, isLowPower, () => true);
  const [ready, setReady] = useState(false);

  // Defer the ~900 KB WebGL bundle so it never blocks first paint or input:
  // desktop loads it when the browser is idle; phones/low-power devices on first interaction.
  useEffect(() => {
    if (reduce || ready) return;
    const go = () => setReady(true);
    if (lowPower) {
      const events = ["pointerdown", "touchstart", "scroll", "keydown"] as const;
      events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
      return () => events.forEach((e) => window.removeEventListener(e, go));
    }
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(go, { timeout: 3000 })
      : window.setTimeout(go, 1500);
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, [reduce, ready, lowPower]);

  return (
    <div ref={ref} className="h-full w-full">
      {reduce ? (
        <StaticHero showCards />
      ) : ready ? (
        <HeroCanvas running={inView && visible} lowPower={lowPower} />
      ) : (
        <StaticHero showCards={false} />
      )}
    </div>
  );
}
