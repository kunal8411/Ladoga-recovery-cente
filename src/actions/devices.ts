"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { processIngest } from "@/lib/ingest";
import { getCollections } from "@/lib/mongodb";
import { deviceKeyHint, generateDeviceKey, hashDeviceKey } from "@/lib/tokens";

export interface ActivateState {
  ok: boolean;
  message?: string;
  deviceKey?: string;
}

export async function activateWearable(_prev: ActivateState, formData: FormData): Promise<ActivateState> {
  const staff = await requireStaff();
  const id = String(formData.get("patientId") ?? "");
  if (!ObjectId.isValid(id)) return { ok: false, message: "Invalid patient." };
  const cols = await getCollections();
  const patient = await cols.patients.findOne({ _id: new ObjectId(id) });
  if (!patient) return { ok: false, message: "Patient not found." };

  const consentNow = formData.get("consent") === "on";
  if (!patient.consentGiven && !consentNow) {
    return { ok: false, message: "Confirm the patient has consented to biometric and location monitoring." };
  }

  const key = generateDeviceKey();
  const deviceLabel = String(formData.get("deviceLabel") ?? "").trim().slice(0, 60) || "Apple Watch + iPhone";
  const now = new Date();
  await cols.patients.updateOne(
    { _id: patient._id },
    {
      $set: {
        "wearable.status": "pending",
        "wearable.keyHash": hashDeviceKey(key),
        "wearable.keyHint": deviceKeyHint(key),
        "wearable.deviceLabel": deviceLabel,
        "wearable.activatedAt": now,
        ...(consentNow && !patient.consentGiven ? { consentGiven: true, consentDate: now } : {}),
        updatedAt: now,
      },
      $unset: { "wearable.lastSyncAt": "" },
    },
  );
  await logAudit(cols, staff, "device.key_issued", "patient", id, `${patient.mrn} · ${deviceLabel}`);
  revalidatePath("/", "layout");
  return { ok: true, deviceKey: key };
}

export async function revokeWearable(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("patientId") ?? "");
  if (!ObjectId.isValid(id)) return;
  const cols = await getCollections();
  await cols.patients.updateOne(
    { _id: new ObjectId(id) },
    { $set: { "wearable.status": "revoked", updatedAt: new Date() }, $unset: { "wearable.keyHash": "" } },
  );
  await logAudit(cols, staff, "device.revoked", "patient", id);
  revalidatePath("/", "layout");
}

const SCENARIOS = {
  normal: () => ({ heartRate: 68 + Math.round(Math.random() * 14), hrv: 42 + Math.round(Math.random() * 15), steps: 3000 + Math.round(Math.random() * 4000) }),
  high_hr: () => ({ heartRate: 132 + Math.round(Math.random() * 15) }),
  low_hr: () => ({ heartRate: 38 + Math.round(Math.random() * 4) }),
};

export async function sendSimulatedData(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("patientId") ?? "");
  const scenario = String(formData.get("scenario") ?? "normal") as keyof typeof SCENARIOS | "move";
  if (!ObjectId.isValid(id)) return;
  const cols = await getCollections();
  const patient = await cols.patients.findOne({ _id: new ObjectId(id) });
  if (!patient) return;

  let body: Record<string, unknown>;
  if (scenario === "move") {
    const lat = Number(formData.get("lat"));
    const lng = Number(formData.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    body = { latitude: lat, longitude: lng, accuracy: 10 };
  } else {
    body = (SCENARIOS[scenario] ?? SCENARIOS.normal)();
  }
  await processIngest(cols, patient, body, "simulated");
  await logAudit(cols, staff, "device.simulated_data", "patient", id, scenario);
  revalidatePath("/", "layout");
}
