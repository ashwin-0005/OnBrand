"use client";

import { Sparkles } from "lucide-react";
import { useId, useState } from "react";

/** Persistent AI-use disclosure with a hover/focus tooltip (WCAG 1.4.13: dismissible with Escape). */
export function AiBadge({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-describedby={tipId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
          dark ? "bg-white/10 text-white ring-1 ring-white/25" : "bg-yellow/25 text-ink ring-1 ring-yellow"
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        AI used
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={`absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg ${
          open ? "block" : "hidden"
        }`}
      >
        AI suggestions only. You decide.
      </span>
    </span>
  );
}
