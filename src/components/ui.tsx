import clsx from "clsx";
import type { ReactNode } from "react";
import type { AlertSeverity, AlertStatus, WearableStatus } from "@/lib/types";
import { WEARABLE_LABELS } from "@/lib/format";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("card", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "slate" | "green" | "amber" | "rose" | "blue" | "violet" | "teal";

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  teal: "bg-brand-50 text-brand-700 ring-brand-200",
};

export function Badge({ tone = "slate", children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONES[tone])}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function WearableBadge({ status, online }: { status: WearableStatus; online?: boolean }) {
  if (status === "active") {
    return online ? (
      <Badge tone="green" dot>
        Live
      </Badge>
    ) : (
      <Badge tone="amber" dot>
        Offline
      </Badge>
    );
  }
  const tone: Record<WearableStatus, Tone> = { active: "green", pending: "blue", not_paired: "slate", revoked: "rose" };
  return <Badge tone={tone[status]}>{WEARABLE_LABELS[status]}</Badge>;
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const map: Record<AlertSeverity, Tone> = { critical: "rose", warning: "amber", info: "blue" };
  return <Badge tone={map[severity]}>{severity[0].toUpperCase() + severity.slice(1)}</Badge>;
}

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const map: Record<AlertStatus, Tone> = { active: "rose", acknowledged: "amber", resolved: "green" };
  return <Badge tone={map[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>;
}

export function SyntheticBadge() {
  return <Badge tone="violet">Synthetic</Badge>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}
