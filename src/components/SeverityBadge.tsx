import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { Severity } from "@/types";

/** Severity is never colour alone: icon + text label + colour. */
const styles: Record<Severity, { icon: typeof Info; cls: string }> = {
  High: { icon: AlertCircle, cls: "bg-coral text-navy-900" },
  Medium: { icon: AlertTriangle, cls: "bg-yellow text-navy-900" },
  Low: { icon: Info, cls: "bg-[#d3d8e0] text-ink" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { icon: Icon, cls } = styles[severity];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>
        <span className="sr-only">Severity: </span>
        {severity}
      </span>
    </span>
  );
}
