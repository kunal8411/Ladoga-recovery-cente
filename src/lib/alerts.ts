import type { ObjectId } from "mongodb";
import { logAudit } from "./audit";
import { fullName } from "./format";
import { isInside } from "./geo";
import type { Collections } from "./mongodb";
import { effectiveThresholds, getAlertRules } from "./settings";
import type { AlertSeverity, AlertThresholds, AlertType, PatientDoc, ReadingType } from "./types";

interface RaiseAlertInput {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  value?: number;
  unit?: string;
  location?: { lat: number; lng: number };
  geofenceId?: ObjectId;
}

/** Creates an alert, or bumps the existing open alert of the same kind so staff aren't flooded. */
export async function raiseAlert(cols: Collections, patient: PatientDoc, input: RaiseAlertInput) {
  const now = new Date();
  const openFilter = {
    patientId: patient._id,
    type: input.type,
    status: { $in: ["active", "acknowledged"] as ("active" | "acknowledged")[] },
    ...(input.geofenceId ? { geofenceId: input.geofenceId } : {}),
  };
  const existing = await cols.alerts.findOneAndUpdate(
    openFilter,
    {
      $set: {
        lastTriggeredAt: now,
        message: input.message,
        ...(input.value !== undefined ? { value: input.value } : {}),
        ...(input.location ? { location: input.location } : {}),
      },
      $inc: { triggerCount: 1 },
    },
    { returnDocument: "after" },
  );
  if (existing) return { created: false, alert: existing };

  const doc = {
    patientId: patient._id,
    patientName: fullName(patient),
    mrn: patient.mrn,
    ...input,
    status: "active" as const,
    createdAt: now,
    lastTriggeredAt: now,
    triggerCount: 1,
  };
  const res = await cols.alerts.insertOne(doc as never);
  await logAudit(cols, "system", "alert.created", "alert", res.insertedId.toString(), `${input.type} for ${patient.mrn}`);
  return { created: true, alert: { ...doc, _id: res.insertedId } };
}

export async function evaluateReadings(
  cols: Collections,
  patient: PatientDoc,
  latest: Partial<Record<ReadingType, number>>,
  thresholds: AlertThresholds,
) {
  let created = 0;
  const hr = latest.heart_rate;
  if (hr !== undefined) {
    if (hr > thresholds.hrHigh) {
      const r = await raiseAlert(cols, patient, {
        type: "hr_high",
        severity: hr > thresholds.hrHigh * 1.2 ? "critical" : "warning",
        title: "High heart rate",
        message: `Heart rate ${Math.round(hr)} bpm is above the ${thresholds.hrHigh} bpm threshold.`,
        value: hr,
        unit: "bpm",
      });
      if (r.created) created++;
    } else if (hr < thresholds.hrLow) {
      const r = await raiseAlert(cols, patient, {
        type: "hr_low",
        severity: hr < thresholds.hrLow * 0.8 ? "critical" : "warning",
        title: "Low heart rate",
        message: `Heart rate ${Math.round(hr)} bpm is below the ${thresholds.hrLow} bpm threshold.`,
        value: hr,
        unit: "bpm",
      });
      if (r.created) created++;
    }
  }
  const spo2 = latest.spo2;
  if (spo2 !== undefined && spo2 < thresholds.spo2Low) {
    const r = await raiseAlert(cols, patient, {
      type: "spo2_low",
      severity: "critical",
      title: "Low blood oxygen",
      message: `SpO₂ ${Math.round(spo2)}% is below the ${thresholds.spo2Low}% threshold.`,
      value: spo2,
      unit: "%",
    });
    if (r.created) created++;
  }
  return created;
}

/** Fires alerts on geofence transitions: leaving a safe zone or entering a restricted one. */
export async function evaluateLocation(cols: Collections, patient: PatientDoc, point: { lat: number; lng: number }) {
  const fences = await cols.geofences.find({ patientId: patient._id, active: true }).toArray();
  const prevState = patient.geofenceState ?? {};
  const nextState: Record<string, boolean> = {};
  let created = 0;

  for (const fence of fences) {
    const id = fence._id.toString();
    const inside = isInside(point, fence);
    const wasInside = prevState[id] ?? fence.kind === "safe";
    nextState[id] = inside;

    if (fence.kind === "safe" && wasInside && !inside) {
      const r = await raiseAlert(cols, patient, {
        type: "geofence_exit",
        severity: "warning",
        title: "Left safe zone",
        message: `Left the "${fence.name}" safe zone.`,
        location: point,
        geofenceId: fence._id,
      });
      if (r.created) created++;
    }
    if (fence.kind === "restricted" && !wasInside && inside) {
      const r = await raiseAlert(cols, patient, {
        type: "geofence_enter",
        severity: "critical",
        title: "Entered restricted area",
        message: `Entered the restricted area "${fence.name}".`,
        location: point,
        geofenceId: fence._id,
      });
      if (r.created) created++;
    }
  }

  await cols.patients.updateOne({ _id: patient._id }, { $set: { geofenceState: nextState } });
  return created;
}

export async function autoResolveNoData(cols: Collections, patientId: ObjectId) {
  await cols.alerts.updateMany(
    { patientId, type: "no_data", status: { $in: ["active", "acknowledged"] } },
    { $set: { status: "resolved", resolvedAt: new Date(), resolvedBy: "System (data resumed)" } },
  );
}

/** Flags paired devices that haven't synced within their no-data window. */
export async function runConnectivityCheck(cols: Collections) {
  const rules = await getAlertRules(cols);
  const paired = await cols.patients
    .find({ "wearable.status": { $in: ["active", "pending"] }, isSynthetic: { $ne: true } })
    .toArray();
  let created = 0;
  for (const p of paired) {
    const t = effectiveThresholds(p, rules);
    const last = p.wearable.lastSyncAt ?? p.wearable.activatedAt;
    if (!last) continue;
    const minutes = (Date.now() - new Date(last).getTime()) / 60000;
    if (minutes > t.noDataMinutes) {
      const hours = Math.floor(minutes / 60);
      const r = await raiseAlert(cols, p, {
        type: "no_data",
        severity: "info",
        title: "No data from device",
        message: `No data received for ${hours >= 1 ? `${hours}h ${Math.round(minutes % 60)}m` : `${Math.round(minutes)} min`} (threshold ${t.noDataMinutes} min).`,
      });
      if (r.created) created++;
    }
  }
  return created;
}
