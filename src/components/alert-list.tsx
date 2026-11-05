import { Activity, HeartPulse, MapPin, WifiOff, Wind } from "lucide-react";
import Link from "next/link";
import { acknowledgeAlert, resolveAlert } from "@/actions/alerts";
import { ALERT_LABELS } from "@/lib/format";
import type { AlertRow } from "@/lib/queries";
import type { AlertType } from "@/lib/types";
import { DateTime, RelativeTime } from "./time";
import { AlertStatusBadge, EmptyState, SeverityBadge } from "./ui";

const ICONS: Record<AlertType, typeof Activity> = {
  hr_high: HeartPulse,
  hr_low: HeartPulse,
  spo2_low: Wind,
  geofence_exit: MapPin,
  geofence_enter: MapPin,
  no_data: WifiOff,
};

const ICON_TONE = {
  critical: "bg-rose-50 text-rose-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-sky-50 text-sky-600",
};

export function AlertList({ alerts, showPatient = true, withNotes = false, emptyText = "No alerts" }: { alerts: AlertRow[]; showPatient?: boolean; withNotes?: boolean; emptyText?: string }) {
  if (alerts.length === 0) return <EmptyState title={emptyText}>Alerts appear here when a reading or location crosses a configured rule.</EmptyState>;
  return (
    <ul className="divide-y divide-slate-100">
      {alerts.map((a) => {
        const Icon = ICONS[a.type];
        return (
          <li key={a.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${ICON_TONE[a.severity]}`}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{ALERT_LABELS[a.type]}</span>
                <SeverityBadge severity={a.severity} />
                <AlertStatusBadge status={a.status} />
                {a.triggerCount > 1 && <span className="text-xs text-slate-400">×{a.triggerCount}</span>}
              </div>
              {showPatient && (
                <Link href={`/patients/${a.patientId}`} className="mt-0.5 inline-block text-sm font-medium text-brand-700 hover:underline">
                  {a.patientName} <span className="font-normal text-slate-400">· {a.mrn}</span>
                </Link>
              )}
              <p className="mt-0.5 text-sm text-slate-600">{a.message}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400">
                <span>
                  <DateTime iso={a.createdAt} /> (<RelativeTime iso={a.createdAt} />)
                </span>
                {a.location && (
                  <a className="hover:text-brand-700" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${a.location.lat},${a.location.lng}`}>
                    {a.location.lat.toFixed(5)}, {a.location.lng.toFixed(5)}
                  </a>
                )}
                {a.acknowledgedBy && <span>Ack by {a.acknowledgedBy}</span>}
                {a.resolvedBy && <span>Resolved by {a.resolvedBy}</span>}
              </div>
              {a.note && <p className="mt-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">Note: {a.note}</p>}
            </div>
            {a.status !== "resolved" && (
              <form className="flex shrink-0 flex-wrap items-center gap-2">
                <input type="hidden" name="alertId" value={a.id} />
                {withNotes && <input name="note" placeholder="Add note (optional)" className="input w-44 py-1.5 text-xs" />}
                {a.status === "active" && (
                  <button formAction={acknowledgeAlert} className="btn-secondary btn-sm">
                    Acknowledge
                  </button>
                )}
                <button formAction={resolveAlert} className="btn-primary btn-sm">
                  Resolve
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
