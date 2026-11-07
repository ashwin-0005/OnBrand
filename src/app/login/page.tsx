"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { usePreferences } from "@/lib/preferences";
import { roleNeeds } from "@/mocks/users";
import type { Role } from "@/types";

const roles = Object.keys(roleNeeds) as Role[];

export default function LoginPage() {
  const { role, setRole } = usePreferences();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-4xl font-bold">Choose a demo role</h1>
      <p className="mt-3 text-muted">Mock sign-in only. Your role is saved in this browser.</p>
      <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Role</legend>
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={role === r}
            onClick={() => {
              setRole(r);
              router.push("/review");
            }}
            className={`flex min-h-[44px] flex-col items-start rounded-[var(--radius-card)] p-6 text-left shadow-sm transition-shadow hover:shadow-md ${
              role === r ? "bg-white ring-2 ring-ink" : "bg-card-light"
            }`}
          >
            <span className="flex items-center gap-2 font-serif text-xl font-bold">
              {r} {role === r && <Check className="h-5 w-5" aria-hidden="true" />}
            </span>
            <span className="mt-1 text-sm text-muted">{roleNeeds[r]}</span>
          </button>
        ))}
      </fieldset>
    </div>
  );
}
