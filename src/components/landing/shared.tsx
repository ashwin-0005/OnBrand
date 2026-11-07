"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/lib/preferences";

export function SectionHeading({
  id,
  eyebrow,
  title,
  sub,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="max-w-3xl">
      {eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold">{eyebrow}</p>}
      <h2 id={id} data-sheen className="text-chrome font-serif text-4xl font-bold leading-tight sm:text-5xl">
        {title}
      </h2>
      {sub && <p className="mt-4 text-lg text-white/80">{sub}</p>}
    </div>
  );
}

/** Card that fades/slides in with a stagger and tilts gently toward the cursor (off when motion is reduced). */
export function TiltCard({
  children,
  index = 0,
  className = "",
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 180, damping: 18 });
  const rotateY = useSpring(ry, { stiffness: 180, damping: 18 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.08 }}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 800 }}
      onPointerMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 10);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      className={`rounded-[var(--radius-card)] metal-card p-6 text-ink ${className}`}
    >
      {children}
    </motion.div>
  );
}
