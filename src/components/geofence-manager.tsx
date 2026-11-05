"use client";

import { MapPin, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { sendSimulatedData } from "@/actions/devices";
import { createGeofence, deleteGeofence } from "@/actions/geofences";
import type { ActionState } from "@/actions/patients";
import type { GeofenceView } from "@/lib/queries";
import { PatientMap, type MapMarker } from "./map";
import { RelativeTime } from "./time";
import { Badge } from "./ui";

interface Props {
  patientId: string;
  patientName: string;
  lastLocation?: { lat: number; lng: number; at: string; accuracy?: number };
  trail: [number, number][];
  fences: GeofenceView[];
}

export function GeofenceManager({ patientId, patientName, lastLocation, trail, fences }: Props) {
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(300);
  const [kind, setKind] = useState<"safe" | "restricted">("safe");
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await createGeofence(prev, formData);
    if (result.ok) setDraft(null);
    return result;
  }, { ok: false });

  const markers: MapMarker[] = lastLocation
    ? [{ id: "latest", lat: lastLocation.lat, lng: lastLocation.lng, label: patientName, sublabel: "Latest location", tone: fences.some((f) => f.kind === "safe" && f.inside === false) ? "rose" : "teal" }]
    : [];

  return (
    <div className="grid gap-0 lg:grid-cols-3">
      <div className="p-3 lg:col-span-2">
        {lastLocation || fences.length ? (
          <PatientMap markers={markers} trail={trail} fences={fences} height={420} onPick={(lat, lng) => setDraft({ lat, lng })} draft={draft ? { ...draft, radiusMeters: radius, kind } : null} />
        ) : (
          <div className="flex h-[420px] flex-col items-center justify-center rounded-lg bg-slate-50 text-center text-sm text-slate-500">
            <MapPin className="mb-2 size-6 text-slate-300" />
            No location received yet.
            <span className="text-xs text-slate-400">It appears after the iPhone sends its first update.</span>
          </div>
        )}
        {lastLocation && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-slate-500">
            <span>
              Last updated <RelativeTime iso={lastLocation.at} />
            </span>
            <span>
              {lastLocation.lat.toFixed(5)}, {lastLocation.lng.toFixed(5)}
              {lastLocation.accuracy ? ` (±${Math.round(lastLocation.accuracy)} m)` : ""}
            </span>
            <a className="text-brand-700 hover:underline" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${lastLocation.lat},${lastLocation.lng}`}>
              Open in Google Maps
            </a>
            <span>{trail.length} points in last 48h</span>
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-slate-100 p-5 lg:border-t-0 lg:border-l">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Geofences</h3>
          <p className="mt-0.5 text-xs text-slate-500">Click the map to place a zone. Alerts fire when the patient leaves a safe zone or enters a restricted area.</p>
        </div>

        <form action={action} className="space-y-3">
          <input type="hidden" name="patientId" value={patientId} />
          <input type="hidden" name="lat" value={draft?.lat ?? ""} />
          <input type="hidden" name="lng" value={draft?.lng ?? ""} />
          <div className="grid grid-cols-2 gap-2">
            {(["safe", "restricted"] as const).map((k) => (
              <label key={k} className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium ${kind === k ? (k === "safe" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-rose-300 bg-rose-50 text-rose-800") : "border-slate-200 text-slate-600"}`}>
                <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                {k === "safe" ? "Safe zone" : "Restricted area"}
              </label>
            ))}
          </div>
          <input name="name" placeholder={kind === "safe" ? "e.g. Treatment center" : "e.g. Former dealer location"} className="input" required />
          <div>
            <span className="label">Radius: {radius} m</span>
            <input type="range" name="radiusMeters" min={50} max={3000} step={50} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-brand-600" />
          </div>
          {!draft && (
            <div className="flex gap-2">
              <p className="flex-1 text-xs text-slate-400">Click the map to choose the center.</p>
              {lastLocation && (
                <button type="button" className="btn-secondary btn-sm" onClick={() => setDraft({ lat: lastLocation.lat, lng: lastLocation.lng })}>
                  Use current location
                </button>
              )}
            </div>
          )}
          {state.message && <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>{state.message}</p>}
          <button disabled={!draft || pending} className="btn-primary w-full">
            {pending ? "Saving…" : "Add zone"}
          </button>
        </form>

        {draft && (
          <form className="rounded-lg border border-dashed border-slate-200 p-3">
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="lat" value={draft.lat} />
            <input type="hidden" name="lng" value={draft.lng} />
            <p className="text-xs text-slate-500">Testing: pretend the patient moved to the selected point.</p>
            <button formAction={sendSimulatedData} name="scenario" value="move" className="btn-secondary btn-sm mt-2">
              Simulate location here
            </button>
          </form>
        )}

        <ul className="space-y-2">
          {fences.length === 0 && <li className="text-xs text-slate-400">No zones yet.</li>}
          {fences.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">{f.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Badge tone={f.kind === "safe" ? "green" : "rose"}>{f.kind === "safe" ? "Safe" : "Restricted"}</Badge>
                  {f.radiusMeters} m
                  {f.inside !== undefined && <span>· {f.inside ? "inside" : "outside"}</span>}
                </div>
              </div>
              <form action={deleteGeofence}>
                <input type="hidden" name="geofenceId" value={f.id} />
                <button className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete zone">
                  <Trash2 className="size-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
