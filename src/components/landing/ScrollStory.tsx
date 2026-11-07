"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RefreshCw } from "lucide-react";
import { steps, loop } from "@/content/landing";
import { useReducedMotion } from "@/lib/preferences";
import dynamic from "next/dynamic";
import { useInView, usePageVisible } from "@/hooks/useInView";
import { StoryScene } from "./StoryScene";
import { SectionHeading } from "./shared";

const StoryCanvas = dynamic(() => import("./StoryCanvas"), { ssr: false });

/**
 * Desktop pinned stage: real WebGL scene, loaded only once the section is near the viewport,
 * paused when off-screen or the tab is hidden. The 2.5D HTML scene shows until it loads.
 */
function StoryStage({ step }: { step: number }) {
  const [ref, inView, seen] = useInView<HTMLDivElement>("400px");
  const visible = usePageVisible();
  return (
    <div ref={ref} className="relative h-[78vh] min-w-0 flex-1">
      {seen ? (
        <StoryCanvas step={step} running={inView && visible} />
      ) : (
        <div className="flex h-full items-center">
          <StoryScene step={step} />
        </div>
      )}
    </div>
  );
}

/**
 * Desktop with motion: the scene is pinned (GSAP ScrollTrigger) while the 6 steps scroll past.
 * Mobile or reduced motion: plain stacked sections, each with its own static scene. Nothing traps keyboard/scroll.
 */
export function ScrollStory() {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce || !root.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 1024px)",
      () => {
        const els = gsap.utils.toArray<HTMLElement>("[data-step]", root.current);
        els.forEach((el, i) =>
          ScrollTrigger.create({
            trigger: el,
            start: "top 60%",
            end: "bottom 60%",
            onToggle: (s) => s.isActive && setActive(i),
          }),
        );
        ScrollTrigger.create({
          trigger: "[data-steps]",
          start: "top 60%",
          end: "bottom 60%",
          onUpdate: (s) => bar.current?.style.setProperty("transform", `scaleY(${s.progress})`),
        });
        ScrollTrigger.create({
          trigger: "[data-steps]",
          start: "top top",
          end: "bottom bottom",
          pin: "[data-pin]",
          pinSpacing: false,
        });
      },
      root,
    );
    return () => mm.revert();
  }, [reduce]);

  const pinned = !reduce;

  return (
    <section id="how" aria-labelledby="how-title" className="relative py-24 text-white">
      <div ref={root} className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="How it works, end to end"
          sub="Six steps, from your rulebook to an approved post. You stay in charge at every one."
        />

        <div className="mt-12 lg:grid lg:grid-cols-2 lg:gap-12">
          <ol data-steps className="relative">
            {steps.map((s, i) => (
              <li
                key={s.title}
                data-step
                className={`py-10 ${pinned ? "lg:flex lg:min-h-[75vh] lg:items-center" : ""}`}
              >
                <div
                  className={`border-l-4 pl-5 transition-colors duration-300 ${pinned && active === i ? "lg:border-yellow" : "border-transparent"}`}
                >
                  <p className="font-mono text-sm text-gold">Step {i + 1} of 6</p>
                  <h3 className="mt-2 font-serif text-3xl font-bold">{s.title}</h3>
                  <p className="mt-3 max-w-md text-lg text-white/80">{s.body}</p>
                </div>
                {/* Inline scene: always on mobile; on desktop only when not pinned. */}
                <div className={`mt-6 ${pinned ? "lg:hidden" : ""}`}>
                  <StoryScene step={i} />
                </div>
              </li>
            ))}
          </ol>

          {pinned && (
            <div className="relative hidden lg:block">
              <div data-pin className="flex h-screen items-center gap-8">
                <StoryStage step={active} />
                <ol aria-label="Progress" className="relative flex flex-col gap-3">
                  <span className="absolute left-[15px] top-4 h-[calc(100%-2rem)] w-0.5 bg-white/15" aria-hidden="true">
                    <span ref={bar} className="block h-full w-full origin-top scale-y-0 bg-yellow" />
                  </span>
                  {steps.map((s, i) => (
                    <li
                      key={s.title}
                      aria-current={active === i ? "step" : undefined}
                      className={`relative grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition-colors ${active >= i ? "bg-yellow text-navy-900" : "bg-navy-700 text-white/70"}`}
                    >
                      {i + 1}
                      <span className="sr-only"> {s.title}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* The loop that makes it better */}
        <div className="mt-20 rounded-[var(--radius-card)] bg-white/5 p-8 ring-1 ring-white/10">
          <h3 className="flex items-center gap-3 font-serif text-2xl font-bold">
            <RefreshCw className="h-6 w-6 text-green [animation:spin_6s_linear_infinite]" aria-hidden="true" />
            The loop that makes it better
          </h3>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {loop.map((l, i) => (
              <li key={l} className="relative rounded-2xl bg-card-light p-5 font-semibold text-ink">
                <span className="mb-2 block font-mono text-sm text-coral-text">0{i + 1}</span>
                {l}
                <span
                  aria-hidden="true"
                  className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-2xl text-yellow md:block"
                >
                  {i < 2 ? "→" : "↺"}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-white/70">…and back to step 1, with clearer rules each time.</p>
        </div>
      </div>
    </section>
  );
}
