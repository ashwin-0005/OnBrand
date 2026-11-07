"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { ShieldMark } from "./Logo";
import { AiBadge } from "./AiBadge";
import { usePreferences } from "@/lib/preferences";

const links = [
  { href: "/review", label: "Review" },
  { href: "/insights", label: "Insights" },
  { href: "/admin", label: "Admin" },
];

export function Navbar() {
  const pathname = usePathname();
  const dark = pathname === "/";
  const { role, manualReduce, setManualReduce } = usePreferences();

  return (
    <header
      className={
        dark
          ? "absolute inset-x-0 top-0 z-40 text-white"
          : "sticky top-0 z-40 border-b border-ink/5 bg-white/90 text-ink backdrop-blur"
      }
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-lg focus:bg-yellow focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6"
      >
        <Link href="/" className="flex min-h-[44px] items-center gap-2 font-serif text-xl font-bold">
          <ShieldMark />
          OnBrand
        </Link>
        <ul className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium ${
                    active
                      ? dark
                        ? "bg-white/15"
                        : "bg-card-light"
                      : dark
                        ? "hover:bg-white/10"
                        : "hover:bg-card-light"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto flex items-center gap-3">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--coral)]"
              checked={manualReduce}
              onChange={(e) => setManualReduce(e.target.checked)}
            />
            Reduce motion
          </label>
          <AiBadge dark={dark} />
          <Link
            href="/login"
            className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
              dark ? "bg-white text-ink" : "bg-ink text-white"
            }`}
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Signed in as: </span>
            {role ?? "Choose role"}
          </Link>
        </div>
      </nav>
    </header>
  );
}
