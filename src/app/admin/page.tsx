"use client";

import { useState } from "react";
import { FileUp, History } from "lucide-react";
import { rules } from "@/mocks/rules";
import { facts, bannedTerms, versionNotes } from "@/mocks/facts";
import { users as initialUsers } from "@/mocks/users";
import { roleNeeds } from "@/mocks/users";
import { Modal } from "@/components/review/Dialogs";
import type { Role, Rule, User } from "@/types";

const card = "rounded-[var(--radius-card)] bg-white p-6 shadow-sm";
const roles = Object.keys(roleNeeds) as Role[];

export default function AdminPage() {
  const [historyFor, setHistoryFor] = useState<Rule | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [people, setPeople] = useState<User[]>(initialUsers);
  const [saved, setSaved] = useState("");

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-serif text-4xl font-bold">Admin</h1>
        <p className="mt-2 text-muted">Guidelines, facts, terms and access. Every change creates a new version.</p>
      </div>

      <section aria-labelledby="g-title" className={card}>
        <h2 id="g-title" className="font-serif text-2xl font-bold">
          Guidelines
        </h2>
        <div className="relative mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th scope="col" className="py-2">
                  Rule
                </th>
                <th scope="col">Category</th>
                <th scope="col">Version</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-ink/10">
                  <th scope="row" className="py-3 pr-4 font-normal">
                    <span className="font-mono font-semibold">{r.id}</span> {r.title}
                    <span className="block max-w-md text-muted">{r.text}</span>
                  </th>
                  <td className="pr-4">{r.category}</td>
                  <td className="pr-4">v{r.version}</td>
                  <td className="pr-4">{r.updatedAt}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setHistoryFor(r)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 font-semibold ring-1 ring-ink/20 hover:bg-card-light"
                    >
                      <History className="h-4 w-4" aria-hidden="true" /> History
                      <span className="sr-only"> for {r.id}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="f-title" className={card}>
          <h2 id="f-title" className="font-serif text-2xl font-bold">
            Facts
          </h2>
          <ul className="mt-4 space-y-3">
            {facts.map((f) => (
              <li key={f.id} className="rounded-2xl bg-card-light p-4 text-sm">
                <p className="font-semibold">
                  {f.label}: {f.value}
                </p>
                <p className="text-muted">
                  Valid from {f.validFrom} · Source: {f.source}
                </p>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 font-semibold">Banned terms</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {bannedTerms.map((t) => (
              <li key={t} className="rounded-full bg-draft-pink px-3 py-1 font-mono text-sm">
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="i-title" className={card}>
          <h2 id="i-title" className="font-serif text-2xl font-bold">
            Import
          </h2>
          <label
            className="mt-4 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/20 p-6 text-center text-sm text-muted hover:border-ink/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setFiles((f) => [...f, ...Array.from(e.dataTransfer.files).map((x) => x.name)]);
            }}
          >
            <FileUp className="h-8 w-8" aria-hidden="true" />
            <span className="mt-2 font-semibold text-ink">Drop guidelines, fact sheets or term lists</span>
            <span>PDF, DOCX, CSV or Markdown. Preview only: nothing is uploaded yet.</span>
            <input
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? []).map((x) => x.name)])}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm" aria-label="Files ready to import">
              {files.map((f, i) => (
                <li key={i} className="rounded-lg bg-card-light px-3 py-2">
                  {f} · <span className="text-muted">ready (demo)</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="r-title" className={card}>
        <h2 id="r-title" className="font-serif text-2xl font-bold">
          People and roles
        </h2>
        <div className="relative mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th scope="col" className="py-2">
                  Name
                </th>
                <th scope="col">Team</th>
                <th scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-t border-ink/10">
                  <th scope="row" className="py-3 font-semibold">
                    {p.name}
                  </th>
                  <td>{p.team}</td>
                  <td>
                    <label className="sr-only" htmlFor={`role-${p.id}`}>
                      Role for {p.name}
                    </label>
                    <select
                      id={`role-${p.id}`}
                      value={p.role}
                      className="min-h-[40px] rounded-xl bg-card-light px-3"
                      onChange={(e) => {
                        const role = e.target.value as Role;
                        setPeople((all) => all.map((x) => (x.id === p.id ? { ...x, role } : x)));
                        setSaved(`${p.name} is now ${role}. Change logged (demo).`);
                      }}
                    >
                      {roles.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p role="status" className="mt-3 text-sm text-green-text">
          {saved}
        </p>
      </section>

      <Modal
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        title={historyFor ? `${historyFor.title} history` : ""}
        side
      >
        {historyFor && (
          <ol className="mt-5 space-y-3">
            {Array.from({ length: historyFor.version }, (_, i) => historyFor.version - i).map((v, i) => (
              <li key={v} className={`rounded-2xl p-4 text-sm ${i === 0 ? "bg-fix-green" : "bg-card-light"}`}>
                <p className="font-semibold">
                  Version {v}
                  {i === 0 && " · current"}
                </p>
                <p className="text-muted">
                  {versionNotes[historyFor.id]?.[i] ?? (v === 1 ? "First version" : "Wording clarified")}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </div>
  );
}
