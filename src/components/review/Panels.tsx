"use client";

import { useState } from "react";
import { SearchX, MessageSquare } from "lucide-react";
import type { Comment, DroppedFinding, HistoryEvent } from "@/types";
import { EmptyState } from "./bits";

/** Findings the citation gate dropped, shown for transparency. */
export function NoSourceList({ items }: { items: DroppedFinding[] }) {
  if (!items.length) return null;
  return (
    <details className="group rounded-2xl bg-card-light p-4">
      <summary className="flex min-h-[32px] cursor-pointer list-none items-center gap-2 font-semibold">
        <SearchX className="h-4 w-4 text-muted" aria-hidden="true" />
        No source found ({items.length})
        <span className="ml-auto text-sm font-normal text-muted group-open:hidden">Show</span>
        <span className="ml-auto hidden text-sm font-normal text-muted group-open:inline">Hide</span>
      </summary>
      <p className="mt-2 text-sm text-muted">
        The AI suggested these, but they don&apos;t cite a rule in your guidelines, so the citation gate dropped them.
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((d) => (
          <li key={d.id} className="rounded-xl bg-white p-3">
            {d.issue}
            <span className="block text-xs text-muted">
              Claimed source: <span className="font-mono">{d.claimedRuleId ?? "none"}</span> · Dropped, “no source
              found”
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function HistoryTimeline({ events }: { events: HistoryEvent[] }) {
  if (!events.length)
    return (
      <EmptyState
        icon={MessageSquare}
        title="No history yet"
        body="Every check, decision and approval is saved here as a revision."
      />
    );
  return (
    <ol className="relative space-y-4 border-l-2 border-ink/10 pl-5">
      {[...events].reverse().map((e) => (
        <li key={e.id} className="relative">
          <span
            className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-indigo-600 ring-4 ring-white"
            aria-hidden="true"
          />
          <p className="text-sm">
            <strong>{e.who}</strong> {e.what}
          </p>
          {e.detail && <p className="text-sm text-muted">“{e.detail}”</p>}
          <p className="text-xs text-muted">
            <time>{e.at}</time>
          </p>
        </li>
      ))}
    </ol>
  );
}

export function CommentThread({ comments, onAdd }: { comments: Comment[]; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div>
      {comments.length ? (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-2xl bg-card-light p-3 text-sm">
              <p>
                <strong>{c.who}</strong> <span className="text-xs text-muted">{c.at}</span>
              </p>
              <p className="mt-1">{c.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          body="Ask a reviewer a question or explain a choice."
        />
      )}
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onAdd(text.trim());
          setText("");
        }}
      >
        <label htmlFor="comment" className="text-sm font-semibold">
          Add a comment
        </label>
        <textarea
          id="comment"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-1 w-full rounded-xl p-3 ring-1 ring-ink/20"
        />
        <button type="submit" className="mt-2 min-h-[40px] rounded-full bg-ink px-4 text-sm font-semibold text-white">
          Post comment
        </button>
      </form>
    </div>
  );
}
