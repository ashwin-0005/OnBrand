"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInDemo } from "@/lib/api";
import { Check } from "lucide-react";
import { usePreferences } from "@/lib/preferences";
import { roleNeeds } from "@/content/roles";
import type { Role } from "@/types";

const roles = Object.keys(roleNeeds) as Role[];

export default function LoginPage() {
  const { role, setRole } = usePreferences();
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-4xl font-bold">Choose a demo role</h1>
      <p className="mt-3 text-muted">Demo sign-in: pick a role. The server checks what each role is allowed to do.</p>
      <p role="alert" className="mt-2 font-semibold text-coral-text">
        {error}
      </p>
      <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Role</legend>
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={role === r}
            onClick={async () => {
              setError("");
              try {
                await signInDemo(r); // server session decides what this role may do
                setRole(r);
                router.push("/review");
              } catch (e) {
                setError((e as Error).message);
              }
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
