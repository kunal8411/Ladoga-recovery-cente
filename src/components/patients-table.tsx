"use client";

import clsx from "clsx";
import { HeartPulse, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { PatientRow } from "@/lib/queries";
import { DateTime, RelativeTime } from "./time";
import { Badge, EmptyState, SyntheticBadge, WearableBadge } from "./ui";

const FILTERS = {
  all: { label: "All", test: () => true },
  monitored: { label: "Wearable active", test: (r: PatientRow) => r.wearableStatus === "active" || r.wearableStatus === "pending" },
  not_paired: { label: "Not paired", test: (r: PatientRow) => r.wearableStatus === "not_paired" || r.wearableStatus === "revoked" },
  alerts: { label: "With open alerts", test: (r: PatientRow) => r.openAlerts > 0 },
} as const;

type FilterKey = keyof typeof FILTERS;

export function PatientsTable({ rows, initialFilter }: { rows: PatientRow[]; initialFilter?: string }) {
  const [filter, setFilter] = useState<FilterKey>(initialFilter && initialFilter in FILTERS ? (initialFilter as FilterKey) : "all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) => FILTERS[filter].test(r) && (!q || r.name.toLowerCase().includes(q) || r.mrn.toLowerCase().includes(q) || r.clinician?.toLowerCase().includes(q)),
    );
  }, [rows, filter, query]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {(Object.keys(FILTERS) as FilterKey[]).map((key) => {
            const count = rows.filter(FILTERS[key].test).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={clsx("rounded-lg px-3 py-1.5 text-xs font-medium", filter === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
              >
                {FILTERS[key].label} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, MRN, clinician" className="input w-64 pl-8" />
        </div>
      </div>
      {visible.length === 0 ? (
        <EmptyState title="No patients match">Try a different filter, or add a patient.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="th">Patient</th>
                <th className="th">Age</th>
                <th className="th">Program</th>
                <th className="th">Admitted</th>
                <th className="th">Wearable</th>
                <th className="th">Latest vitals</th>
                <th className="th">Location</th>
                <th className="th text-right">Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="td">
                    <Link href={`/patients/${r.id}`} className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {r.firstName[0]}
                        {r.lastName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-medium text-slate-900 hover:text-brand-700">
                          {r.name} {r.isSynthetic && <SyntheticBadge />}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.mrn}
                          {r.clinician && ` · ${r.clinician}`}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="td">
                    {r.age}
                    {r.gender && <span className="text-slate-400"> · {r.gender[0]}</span>}
                  </td>
                  <td className="td">
                    <div>{r.program}</div>
                    <div className="text-xs text-slate-500">
                      Day {r.programDay} of {r.programLengthDays}
                    </div>
                  </td>
                  <td className="td">
                    <DateTime iso={r.admissionDate} pattern="MMM d, yyyy" />
                  </td>
                  <td className="td">
                    <WearableBadge status={r.wearableStatus} online={r.online} />
                    {(r.wearableStatus === "active" || r.wearableStatus === "pending") && (
                      <div className="mt-1 text-xs text-slate-400">
                        <RelativeTime iso={r.lastSyncAt} fallback="Never synced" />
                      </div>
                    )}
                  </td>
                  <td className="td">
                    {r.heartRate ? (
                      <div className="flex items-center gap-1.5">
                        <HeartPulse className="size-3.5 text-rose-500" />
                        <span className="font-medium">{Math.round(r.heartRate.value)}</span>
                        <span className="text-xs text-slate-400">bpm</span>
                        {r.steps !== undefined && <span className="text-xs text-slate-400">· {Math.round(r.steps).toLocaleString()} steps</span>}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="td">
                    {r.lastLocation ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className={clsx("size-3.5", r.outsideSafeZone ? "text-rose-500" : "text-brand-600")} />
                        {r.outsideSafeZone ? <Badge tone="rose">Outside safe zone</Badge> : <RelativeTime iso={r.lastLocation.at} />}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="td text-right">
                    {r.openAlerts > 0 ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">{r.openAlerts}</span> : <span className="text-slate-300">0</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
