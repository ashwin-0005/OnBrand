"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AlertCircle, CheckCircle2, FileUp, Info, PencilLine, ScanSearch, ShieldCheck } from "lucide-react";
import {
  addComment,
  approveSubmission,
  checkContent,
  getComments,
  getHistory,
  getRules,
  saveDecision,
} from "@/lib/api";
import { MAX_DRAFT_CHARS, sampleDraft } from "@/content/demo";
import { usePreferences } from "@/lib/preferences";
import { ShieldMark } from "@/components/Logo";
import { AiBadge } from "@/components/AiBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { FindingCard } from "./FindingCard";
import { HighlightedText, applyDecisions } from "./HighlightedText";
import { ConfirmApprove, DisputeModal, SourceDrawer } from "./Dialogs";
import { CommentThread, HistoryTimeline, NoSourceList } from "./Panels";
import { EmptyState } from "./bits";
import type { Comment, Decision, DroppedFinding, Finding, HistoryEvent, Rule, Severity } from "@/types";

type Status = "idle" | "scanning" | "done";
const TABS = ["Findings", "Comments", "History"] as const;
type Tab = (typeof TABS)[number];
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

export function ReviewWorkspace() {
  const { role, reduceMotion } = usePreferences();
  const [rules, setRules] = useState<Rule[]>([]);
  const ruleMap = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [text, setText] = useState(sampleDraft);
  const [status, setStatus] = useState<Status>("idle");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [dropped, setDropped] = useState<DroppedFinding[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [revealed, setRevealed] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Findings");
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [source, setSource] = useState<Rule | null>(null);
  const [disputing, setDisputing] = useState<Finding | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [approved, setApproved] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Rules come from the server: they draw source chips and must match the citation gate.
  useEffect(() => {
    getRules()
      .then(setRules)
      .catch((e) => setError(errMsg(e)));
  }, []);

  /** History is the server's audit trail; refresh it after every action. */
  const refreshHistory = (sid: string) =>
    getHistory(sid)
      .then((h) => setHistory(h.map((e) => ({ ...e, at: time(e.at) }))))
      .catch(() => {});

  // Reveal highlights one by one after a check.
  useEffect(() => {
    if (status !== "done" || revealed >= findings.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), reduceMotion ? 0 : 220);
    return () => clearTimeout(t);
  }, [status, revealed, findings.length, reduceMotion]);

  async function runCheck() {
    if (!text.trim()) return;
    setStatus("scanning");
    setError(null);
    setNotice(null);
    setAnnounce("Checking content against your guidelines…");
    setDecisions({});
    setRevealed(0);
    setApproved(false);
    setComments([]);
    setHistory([]);
    try {
      const res = await checkContent(text);
      setFindings(res.findings);
      setDropped(res.dropped);
      setSubmissionId(res.submissionId ?? null);
      setNotice(res.notice ?? null);
      setStatus("done");
      setTab("Findings");
      setAnnounce(`Review complete: ${res.findings.length} findings.`);
      if (res.submissionId) refreshHistory(res.submissionId);
    } catch (e) {
      setStatus("idle");
      setError(errMsg(e));
      setAnnounce(`Check failed: ${errMsg(e)}`);
    }
  }

  function editDraft() {
    setText(applyDecisions(text, findings, decisions));
    setStatus("idle");
    setFindings([]);
    setDropped([]);
    setDecisions({});
    setSubmissionId(null);
    setNotice(null);
  }

  /** Saved on the server first (it enforces dispute reasons), then shown. */
  const decide = async (f: Finding, d: Decision, what: string) => {
    if (!submissionId) return;
    setError(null);
    try {
      const saved = await saveDecision(submissionId, f.id, d);
      setDecisions((all) => ({ ...all, [f.id]: saved }));
      setAnnounce(`${f.issue}: ${what}.`);
      refreshHistory(submissionId);
      setTimeout(() => document.getElementById(`finding-${f.id}`)?.focus(), 50);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  async function approveDraft() {
    setConfirming(false);
    if (!submissionId) return;
    setError(null);
    try {
      await approveSubmission(submissionId);
      setApproved(true);
      setAnnounce("Draft approved.");
      refreshHistory(submissionId);
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function postComment(t: string) {
    if (!submissionId) return;
    setError(null);
    try {
      await addComment(submissionId, t);
      setComments((await getComments(submissionId)).map((c) => ({ ...c, at: time(c.at) })));
      refreshHistory(submissionId);
    } catch (e) {
      setError(errMsg(e));
    }
  }

  const openCount = findings.filter((f) => !decisions[f.id] || decisions[f.id].state === "open").length;
  const bySeverity = (s: Severity) => findings.filter((f) => f.severity === s).length;
  const cited = findings.length
    ? Math.round((findings.filter((f) => ruleMap.has(f.rule_id)).length / findings.length) * 100)
    : 100;
  const canApprove = role === "Reviewer" || role === "Admin";

  const onTabKey = (e: KeyboardEvent, i: number) => {
    const n = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : -1;
    if (n < 0) return;
    e.preventDefault();
    setTab(TABS[n]);
    tabRefs.current[n]?.focus();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold">Review content</h1>
          <p className="mt-2 text-muted">
            Suggestions only. Nothing is auto-published or auto-rewritten; changes apply only when you accept them.
          </p>
        </div>
        <AiBadge />
      </div>

      <p className="sr-only" aria-live="polite" role="status">
        {announce}
      </p>

      {error && (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-2xl bg-draft-pink px-5 py-3 text-sm font-semibold text-ink"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-coral-text" aria-hidden="true" /> {error}
        </p>
      )}
      {notice && status === "done" && (
        <p
          role="status"
          className="mt-6 flex items-start gap-2 rounded-2xl bg-yellow/25 px-5 py-3 text-sm font-semibold text-ink"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {notice}
        </p>
      )}

      {/* Summary bar */}
      {status === "done" && (
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-card-light px-5 py-3 text-sm">
          <strong>{findings.length} findings</strong>
          {(["High", "Medium", "Low"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <SeverityBadge severity={s} /> {bySeverity(s)}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 font-semibold text-green-text">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {cited}% of shown findings cite a source
          </span>
          {approved && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-green px-3 py-1 font-bold text-navy-900">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Approved
            </span>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* LEFT: input */}
        <section aria-labelledby="draft-title" className="rounded-[var(--radius-card)] bg-white p-6 shadow-sm">
          <h2 id="draft-title" className="font-semibold">
            Your draft
          </h2>

          {status === "idle" ? (
            <>
              <label htmlFor="draft" className="sr-only">
                Draft text
              </label>
              <textarea
                id="draft"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                maxLength={MAX_DRAFT_CHARS}
                aria-describedby="draft-count"
                className="mt-3 w-full rounded-2xl bg-card-light p-4 text-lg leading-relaxed ring-1 ring-ink/10"
              />
              <p
                id="draft-count"
                className={`mt-1 text-right text-xs ${text.length >= MAX_DRAFT_CHARS ? "font-semibold text-coral-text" : "text-muted"}`}
              >
                {text.length} / {MAX_DRAFT_CHARS} characters (free plan limit)
              </p>
              <label
                className="mt-4 flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/20 p-4 text-center text-sm text-muted hover:border-ink/40"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setFileName(e.dataTransfer.files[0]?.name ?? null);
                }}
              >
                <FileUp className="h-6 w-6" aria-hidden="true" />
                <span className="mt-1 font-semibold text-ink">{fileName ?? "Upload an image or PDF"}</span>
                <span>Drag and drop, or click to choose. (Preview only: file checks are not available yet.)</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                />
              </label>
              <button
                type="button"
                onClick={runCheck}
                disabled={!text.trim()}
                className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-coral px-7 font-semibold text-navy-900 disabled:opacity-50"
              >
                <ScanSearch className="h-5 w-5" aria-hidden="true" /> Check content
              </button>
            </>
          ) : (
            <>
              <div
                className="relative mt-3 overflow-hidden rounded-2xl bg-card-light p-4"
                aria-busy={status === "scanning"}
              >
                {status === "scanning" ? (
                  <p className="whitespace-pre-wrap text-lg leading-relaxed">{text}</p>
                ) : (
                  <HighlightedText
                    text={text}
                    findings={findings}
                    decisions={decisions}
                    revealed={revealed}
                    activeId={activeId}
                    onActive={setActiveId}
                    onSelect={(id) => {
                      setTab("Findings");
                      setTimeout(() => document.getElementById(`finding-${id}`)?.focus(), 30);
                    }}
                  />
                )}
                {status === "scanning" && !reduceMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-x-0 h-0.5 bg-coral shadow-[0_0_14px_3px_rgba(224,122,95,0.6)]"
                    initial={{ top: "0%" }}
                    animate={{ top: ["0%", "100%"] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </div>
              {status === "done" && (
                <button
                  type="button"
                  onClick={editDraft}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 font-semibold ring-1 ring-ink/20 hover:bg-card-light"
                >
                  <PencilLine className="h-4 w-4" aria-hidden="true" /> Edit draft and re-check
                </button>
              )}
            </>
          )}
        </section>

        {/* RIGHT: tabs */}
        <section aria-label="Review panel" className="rounded-[var(--radius-card)] bg-white p-6 shadow-sm">
          <div role="tablist" aria-label="Review panel" className="flex gap-1 rounded-full bg-card-light p-1">
            {TABS.map((t, i) => (
              <button
                key={t}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                id={`tab-${t}`}
                aria-controls={`panel-${t}`}
                aria-selected={tab === t}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => setTab(t)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`min-h-[40px] flex-1 rounded-full text-sm font-semibold ${tab === t ? "bg-white shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {t}
                {t === "Findings" && status === "done" ? ` (${findings.length})` : ""}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-5">
            {tab === "Findings" && (
              <>
                {status === "idle" && (
                  <EmptyState
                    icon={ScanSearch}
                    title="Nothing checked yet"
                    body={`Press “Check content”. Rule checks run first, then AI. Every finding cites one of ${rules.length} approved rules.`}
                  />
                )}
                {status === "scanning" && (
                  <div className="flex flex-col items-center py-12 text-center">
                    <motion.span
                      animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      <ShieldMark className="h-14 w-14" />
                    </motion.span>
                    <p className="mt-4 font-semibold">Scanning…</p>
                    <p className="text-sm text-muted">Rule checks first, then AI, then the citation gate.</p>
                  </div>
                )}
                {status === "done" && (
                  <div className="space-y-4">
                    {findings.length === 0 && (
                      <EmptyState
                        icon={CheckCircle2}
                        title="No findings"
                        body="Nothing in this draft breaks a rule we know about."
                      />
                    )}
                    <AnimatePresence>
                      {findings.map((f, i) => {
                        const rule = ruleMap.get(f.rule_id);
                        if (!rule) return null;
                        return (
                          <FindingCard
                            key={f.id}
                            finding={f}
                            rule={rule}
                            index={i}
                            decision={decisions[f.id] ?? { state: "open" }}
                            active={activeId === f.id}
                            onActive={setActiveId}
                            onOpenSource={setSource}
                            onAccept={(x) =>
                              decide(
                                x,
                                { state: "accepted", fix: x.suggested_fix },
                                `accepted the fix for “${x.issue}”`,
                              )
                            }
                            onEdit={(x, fix) => decide(x, { state: "edited", fix }, `edited the fix for “${x.issue}”`)}
                            onDispute={setDisputing}
                          />
                        );
                      })}
                    </AnimatePresence>
                    <NoSourceList items={dropped} />

                    <div className="rounded-2xl bg-card-light p-4">
                      {canApprove ? (
                        <button
                          type="button"
                          disabled={approved}
                          onClick={() => setConfirming(true)}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-green px-6 font-semibold text-navy-900 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> {approved ? "Approved" : "Approve"}
                        </button>
                      ) : (
                        <p className="text-sm text-muted">
                          Only Reviewers and Admins can approve. Switch role from the badge in the top bar.
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted">
                        Approval records sign-off. OnBrand never publishes content itself.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            {tab === "Comments" &&
              (submissionId ? (
                <CommentThread comments={comments} onAdd={postComment} />
              ) : (
                <EmptyState
                  icon={ScanSearch}
                  title="No review yet"
                  body="Run a check first. Comments are saved with each review."
                />
              ))}
            {tab === "History" && <HistoryTimeline events={history} />}
          </div>
        </section>
      </div>

      <SourceDrawer rule={source} onClose={() => setSource(null)} />
      <DisputeModal
        finding={disputing}
        onClose={() => setDisputing(null)}
        onSubmit={(f, reason) => decide(f, { state: "disputed", reason }, `disputed “${f.issue}”`)}
      />
      <ConfirmApprove
        open={confirming}
        openCount={openCount}
        onClose={() => setConfirming(false)}
        onConfirm={approveDraft}
      />
    </div>
  );
}
