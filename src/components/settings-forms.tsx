"use client";

import { useActionState } from "react";
import type { ActionState } from "@/actions/patients";
import { saveAlertRules, seedDemoData } from "@/actions/settings";
import type { AlertThresholds } from "@/lib/types";

const FIELDS: { key: keyof AlertThresholds; label: string; unit: string; help: string }[] = [
  { key: "hrHigh", label: "High heart rate", unit: "bpm", help: "Alert when heart rate is above this value." },
  { key: "hrLow", label: "Low heart rate", unit: "bpm", help: "Alert when heart rate is below this value." },
  { key: "spo2Low", label: "Low blood oxygen", unit: "%", help: "Alert when SpO₂ is below this value (if the device supports it)." },
  { key: "noDataMinutes", label: "Device offline after", unit: "minutes", help: "Alert when a paired device hasn't sent data for this long." },
];

export function AlertRulesForm({ rules, canEdit }: { rules: AlertThresholds; canEdit: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveAlertRules, { ok: false });
  return (
    <form action={action} className="divide-y divide-slate-100">
      {FIELDS.map((f) => (
        <div key={f.key} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-sm font-medium text-slate-800">{f.label}</div>
            <div className="text-xs text-slate-500">{f.help}</div>
          </div>
          <div className="flex items-center gap-2">
            <input name={f.key} type="number" defaultValue={rules[f.key]} disabled={!canEdit} className="input w-28 text-right" required />
            <span className="w-16 text-xs text-slate-500">{f.unit}</span>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>{state.message ?? (!canEdit && "Only admins can change clinic-wide rules.")}</span>
        <button disabled={!canEdit || pending} className="btn-primary">
          {pending ? "Saving…" : "Save rules"}
        </button>
      </div>
    </form>
  );
}

export function DemoDataForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(seedDemoData, { ok: false });
  return (
    <form action={action} className="space-y-3 p-5">
      <p className="text-sm text-slate-600">
        Synthetic patients are clearly labeled and contain no real health information. Use them to demonstrate multi-patient monitoring next to your own live Apple Watch.
      </p>
      <div className="flex flex-wrap gap-2">
        <button name="kind" value="intake" disabled={pending} className="btn-secondary">
          Add 5 intake patients
        </button>
        <button name="kind" value="simulated" disabled={pending} className="btn-secondary">
          Add simulated wearable patient
        </button>
        <button name="kind" value="remove" disabled={pending} className="btn-danger">
          Remove all synthetic data
        </button>
      </div>
      {state.message && <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>{state.message}</p>}
    </form>
  );
}
