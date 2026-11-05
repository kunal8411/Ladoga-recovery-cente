"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { isInside } from "@/lib/geo";
import { getCollections } from "@/lib/mongodb";
import type { ActionState } from "./patients";

const schema = z.object({
  patientId: z.string().refine(ObjectId.isValid, "Invalid patient"),
  name: z.string().trim().min(1, "Give the zone a name").max(80),
  kind: z.enum(["safe", "restricted"]),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(50, "Radius must be at least 50 m").max(50_000),
});

export async function createGeofence(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { patientId, ...fence } = parsed.data;
  const cols = await getCollections();
  const pid = new ObjectId(patientId);
  const res = await cols.geofences.insertOne({
    _id: new ObjectId(),
    patientId: pid,
    ...fence,
    active: true,
    createdAt: new Date(),
    createdBy: staff.id,
  });

  // Seed the current inside/outside state so the next location update only alerts on a real transition.
  const patient = await cols.patients.findOne({ _id: pid }, { projection: { lastLocation: 1 } });
  if (patient?.lastLocation) {
    await cols.patients.updateOne(
      { _id: pid },
      { $set: { [`geofenceState.${res.insertedId.toString()}`]: isInside(patient.lastLocation, fence) } },
    );
  }
  await logAudit(cols, staff, "geofence.created", "patient", patientId, `${fence.kind}: ${fence.name} (${fence.radiusMeters} m)`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Zone added." };
}

export async function deleteGeofence(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("geofenceId") ?? "");
  if (!ObjectId.isValid(id)) return;
  const cols = await getCollections();
  const fence = await cols.geofences.findOne({ _id: new ObjectId(id) });
  if (!fence) return;
  await cols.geofences.deleteOne({ _id: fence._id });
  await cols.patients.updateOne({ _id: fence.patientId }, { $unset: { [`geofenceState.${id}`]: "" } });
  await logAudit(cols, staff, "geofence.deleted", "patient", fence.patientId.toString(), fence.name);
  revalidatePath("/", "layout");
}
