"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useDialog } from "@/hooks/useDialog";
import type { Finding, Rule } from "@/types";

export function Modal({
  open,
  onClose,
  title,
  children,
  side = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: boolean;
}) {
  const ref = useDialog<HTMLDivElement>(open, onClose);
  const id = useId();
  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-50 flex ${side ? "justify-end" : "items-center justify-center p-4"}`}>
          <motion.div
            className="absolute inset-0 bg-navy-900/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            initial={side ? { x: "100%" } : { opacity: 0, scale: 0.96 }}
            animate={side ? { x: 0 } : { opacity: 1, scale: 1 }}
            exit={side ? { x: "100%" } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`relative bg-white p-6 text-ink shadow-2xl ${side ? "h-full w-full max-w-md overflow-y-auto" : "w-full max-w-lg rounded-[var(--radius-card)]"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={id} className="font-serif text-2xl font-bold">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-card-light"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function SourceDrawer({ rule, onClose }: { rule: Rule | null; onClose: () => void }) {
  return (
    <Modal open={!!rule} onClose={onClose} title={rule?.title ?? ""} side>
      {rule && (
        <div className="mt-4 space-y-4">
          <p className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-card-light px-3 py-1 font-mono">{rule.id}</span>
            <span className="rounded-full bg-card-light px-3 py-1">Version {rule.version}</span>
            <span className="rounded-full bg-card-light px-3 py-1">{rule.category}</span>
          </p>
          <blockquote className="rounded-2xl border-l-4 border-indigo-600 bg-card-light p-4 text-lg">
            {rule.text}
          </blockquote>
          <p className="text-sm text-muted">
            Last updated {rule.updatedAt}. This is the approved source the finding cites.
          </p>
        </div>
      )}
    </Modal>
  );
}

export function DisputeModal({
  finding,
  onClose,
  onSubmit,
}: {
  finding: Finding | null;
  onClose: () => void;
  onSubmit: (f: Finding, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);
  const close = () => {
    setReason("");
    setError(false);
    onClose();
  };
  return (
    <Modal open={!!finding} onClose={close} title="Dispute this finding">
      {finding && (
        <form
          noValidate
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) {
              setError(true);
              (e.currentTarget.elements.namedItem("reason") as HTMLTextAreaElement).focus();
              return;
            }
            onSubmit(finding, reason.trim());
            close();
          }}
        >
          <p className="text-sm text-muted">
            “{finding.issue}” on <q>{finding.phrase}</q>
          </p>
          <label htmlFor="dispute-reason" className="mt-4 block font-semibold">
            Reason <span className="font-normal text-muted">(required)</span>
          </label>
          <textarea
            id="dispute-reason"
            name="reason"
            data-autofocus
            rows={4}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.trim()) setError(false);
            }}
            aria-invalid={error}
            aria-describedby="dispute-help"
            className={`mt-1 w-full rounded-xl p-3 ring-1 ${error ? "ring-2 ring-coral-text" : "ring-ink/20"}`}
          />
          <p id="dispute-help" className={`mt-1 text-sm ${error ? "font-semibold text-coral-text" : "text-muted"}`}>
            {error
              ? "Please write a reason. Overrides need a reason and are audited."
              : "Overrides need a reason and are audited."}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="min-h-[44px] rounded-full px-5 font-semibold ring-1 ring-ink/20"
            >
              Cancel
            </button>
            <button type="submit" className="min-h-[44px] rounded-full bg-ink px-5 font-semibold text-white">
              Submit dispute
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function ConfirmApprove({
  open,
  openCount,
  onClose,
  onConfirm,
}: {
  open: boolean;
  openCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Approve this draft?">
      <p className="mt-4">
        This records your sign-off in the history. OnBrand never publishes anything itself; your team still does that.
      </p>
      {openCount > 0 && (
        <p className="mt-3 rounded-xl bg-yellow/25 p-3 text-sm font-semibold">
          {openCount} finding{openCount > 1 ? "s are" : " is"} still undecided.
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-full px-5 font-semibold ring-1 ring-ink/20"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-[44px] rounded-full bg-green px-5 font-semibold text-navy-900"
        >
          Yes, approve
        </button>
      </div>
    </Modal>
  );
}
