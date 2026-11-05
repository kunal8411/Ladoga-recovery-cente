"use client";

import { useActionState } from "react";
import { updatePatientThresholds, type ActionState } from "@/actions/patients";
import type { AlertThresholds } from "@/lib/types";

const FIELDS: { key: keyof AlertThresholds; label: string; unit: string }[] = [
  { key: "hrHigh", label: "High heart rate", unit: "bpm" },
  { key: "hrLow", label: "Low heart rate", unit: "bpm" },
  { key: "spo2Low", label: "Low SpO₂", unit: "%" },
  { key: "noDataMinutes", label: "No data after", unit: "min" },
];

export function ThresholdForm({ patientId, overrides, rules }: { patientId: string; overrides: Partial<AlertThresholds>; rules: AlertThresholds }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updatePatientThresholds, { ok: false });
  return (
    <form action={action} className="space-y-3 p-5">
      <input type="hidden" name="patientId" value={patientId} />
      <p className="text-xs text-slate-500">Leave blank to use the clinic-wide default (shown as placeholder).</p>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key}>
            <span className="label">
              {f.label} <span className="text-slate-400">({f.unit})</span>
            </span>
            <input name={f.key} type="number" min={0} defaultValue={overrides[f.key] ?? ""} placeholder={String(rules[f.key])} className="input" />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>{state.message}</span>
        <button disabled={pending} className="btn-secondary btn-sm">
          {pending ? "Saving…" : "Save thresholds"}
        </button>
      </div>
    </form>
  );
}
