"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/preferences";

/**
 * Scroll-linked effects for the landing page (all scrubbed to scroll position):
 *  [data-reveal]   cards rise and tilt up into place
 *  [data-sheen]    chrome/gold headings: light sweeps across as you scroll
 *  [data-marquee]  metallic text bands slide sideways (direction from data-marquee="left|right")
 *  [data-hero-copy] hero text drifts up and fades as you leave the hero
 * Off when motion is reduced: everything is simply visible.
 */
export function ScrollFX() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    gsap.registerPlugin(ScrollTrigger);
    let ctx: gsap.Context | undefined;
    // Set up at idle: the effects are below the fold, so this keeps hydration fast.
    const setup = () => {
      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 90, rotateX: -28, scale: 0.94, transformPerspective: 900, transformOrigin: "50% 100%" },
            {
              opacity: 1,
              y: 0,
              rotateX: 0,
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top 98%", end: "top 62%", scrub: 0.6 },
            },
          );
        });
        gsap.utils.toArray<HTMLElement>("[data-sheen]").forEach((el) => {
          gsap.fromTo(
            el,
            { "--sheen": "100%" },
            {
              "--sheen": "0%",
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "bottom 20%", scrub: true },
            },
          );
        });
        gsap.utils.toArray<HTMLElement>("[data-marquee]").forEach((el) => {
          const left = el.dataset.marquee !== "right";
          gsap.fromTo(
            el,
            { xPercent: left ? 0 : -35 },
            {
              xPercent: left ? -35 : 0,
              ease: "none",
              scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: 0.4 },
            },
          );
        });
        gsap.utils.toArray<HTMLElement>("[data-hero-copy]").forEach((el) => {
          gsap.to(el, {
            y: -120,
            opacity: 0.15,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top 15%", end: "bottom top", scrub: true },
          });
        });
      });
      ScrollTrigger.refresh();
    };
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(setup, { timeout: 2000 })
      : window.setTimeout(setup, 500);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      ctx?.revert();
    };
  }, [reduce]);
  return null;
}

/** Big metallic text band that slides with scroll. Decorative. */
export function MetalMarquee({ words, direction = "left" }: { words: string[]; direction?: "left" | "right" }) {
  const line = [...words, ...words, ...words].join("  ·  ");
  return (
    <div aria-hidden="true" className="relative overflow-hidden py-10">
      <div
        data-marquee={direction}
        className="whitespace-nowrap font-serif text-[clamp(3rem,9vw,8rem)] font-bold leading-none"
      >
        <span className="text-outline-metal deco-text" data-text={line} />
      </div>
      <div
        data-marquee={direction === "left" ? "right" : "left"}
        className="mt-2 whitespace-nowrap font-serif text-[clamp(2rem,5vw,4.5rem)] font-bold leading-none"
      >
        <span className="text-chrome deco-text opacity-70" data-text={line} />
      </div>
    </div>
  );
}
