"use client";

import Link from "next/link";
import { PenLine, BarChart3, Scale, Settings } from "lucide-react";
import { problems, responsible, benefits } from "@/content/landing";
import { roleNeeds } from "@/content/roles";
import type { Role } from "@/types";
import { SectionHeading, TiltCard } from "./shared";
import { CountUp } from "./CountUp";

export function ProblemSection() {
  return (
    <section aria-labelledby="problem-title" className="relative py-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading id="problem-title" eyebrow="The problem" title="Brand mistakes are caught too late." />
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((p, i) => (
            <li key={p.title} data-reveal>
              <TiltCard index={i} className="h-full">
                <p.icon className="h-8 w-8 text-coral-text" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-bold">{p.title}</h3>
                <p className="mt-2 text-muted">{p.body}</p>
                <p className="mt-4 rounded-xl bg-draft-pink px-3 py-2 text-sm font-semibold">{p.sample}</p>
              </TiltCard>
            </li>
          ))}
        </ul>
        <p className="mt-12 max-w-3xl text-xl text-white/85">
          Today&apos;s review is manual, slow and unrecorded, and nobody learns which rules keep failing.
        </p>
      </div>
    </section>
  );
}

const roleIcons: Record<Role, typeof PenLine> = {
  Creator: PenLine,
  "Brand manager": BarChart3,
  Reviewer: Scale,
  Admin: Settings,
};

export function RoleCards() {
  return (
    <section aria-labelledby="roles-title" className="relative py-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading id="roles-title" eyebrow="Who it's for" title="One place for everyone who touches content." />
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(roleNeeds) as Role[]).map((r, i) => {
            const Icon = roleIcons[r];
            return (
              <li key={r} data-reveal>
                <TiltCard index={i} className="h-full">
                  <Icon className="h-8 w-8 text-indigo-600" aria-hidden="true" />
                  <h3 className="mt-4 text-xl font-bold">{r}</h3>
                  <p className="mt-2 text-muted">{roleNeeds[r]}</p>
                </TiltCard>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function ResponsibleCards() {
  return (
    <section aria-labelledby="resp-title" className="relative py-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading id="resp-title" eyebrow="Responsible by design" title="Trust is built in, not bolted on." />
        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {responsible.map((c, i) => (
            <li key={c.title} data-reveal>
              <TiltCard index={i} className="flex h-full gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-fix-green">
                  <c.icon className="h-6 w-6 text-green-text" aria-hidden="true" />
                </span>
                <span>
                  <h3 className="text-xl font-bold">{c.title}</h3>
                  <p className="mt-2 text-muted">{c.body}</p>
                </span>
              </TiltCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function BenefitTiles() {
  return (
    <section aria-labelledby="why-title" className="relative py-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading id="why-title" eyebrow="Why it matters" title="Less rework. More trust." />
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => (
            <li key={b.title} data-reveal>
              <TiltCard index={i} className="h-full">
                <p className="font-serif text-5xl font-bold text-indigo-600">
                  <CountUp value={b.value} suffix={b.suffix} />
                </p>
                <h3 className="mt-3 text-lg font-bold">{b.title}</h3>
                <p className="mt-1 text-sm text-muted">{b.body}</p>
              </TiltCard>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-white/70">Illustrative targets for a pilot, not measured results.</p>

        <div className="mt-24 text-center">
          <p data-sheen className="text-gold font-serif text-5xl font-bold leading-tight sm:text-7xl">
            Automation that earns trust.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-white/85">
            Grounded in approved sources. Explained in plain language. Decided by people.
          </p>
          <Link
            href="/review"
            className="mt-10 inline-flex min-h-[52px] items-center btn-gold rounded-full px-9 text-lg font-semibold transition-transform hover:-translate-y-0.5"
          >
            Try a review
          </Link>
        </div>
      </div>
    </section>
  );
}
