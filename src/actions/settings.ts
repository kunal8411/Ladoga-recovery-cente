"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { getCollections } from "@/lib/mongodb";
import { removeSyntheticData, seedIntakePatients, seedSimulatedPatient } from "@/lib/seed";
import { ALERT_RULES_ID } from "@/lib/settings";
import type { ActionState } from "./patients";

const rulesSchema = z
  .object({
    hrHigh: z.coerce.number().min(60).max(220),
    hrLow: z.coerce.number().min(20).max(100),
    spo2Low: z.coerce.number().min(70).max(100),
    noDataMinutes: z.coerce.number().int().min(5).max(7 * 24 * 60),
  })
  .refine((r) => r.hrLow < r.hrHigh, "Low heart rate must be below high heart rate");

export async function saveAlertRules(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let staff;
  try {
    staff = await requireAdmin();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const parsed = rulesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  const cols = await getCollections();
  await cols.settings.updateOne(
    { _id: ALERT_RULES_ID },
    { $set: { ...parsed.data, updatedAt: new Date(), updatedBy: staff.name } },
    { upsert: true },
  );
  await logAudit(cols, staff, "settings.alert_rules_updated", "settings", ALERT_RULES_ID, JSON.stringify(parsed.data));
  revalidatePath("/", "layout");
  return { ok: true, message: "Alert rules saved." };
}

export async function seedDemoData(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let staff;
  try {
    staff = await requireAdmin();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const kind = String(formData.get("kind") ?? "intake");
  const cols = await getCollections();
  let message: string;
  if (kind === "simulated") {
    const n = await seedSimulatedPatient(cols);
    message = n ? "Added a simulated wearable patient." : "The simulated patient already exists.";
  } else if (kind === "remove") {
    const n = await removeSyntheticData(cols);
    message = `Removed ${n} synthetic patient(s) and their data.`;
  } else {
    const n = await seedIntakePatients(cols);
    message = n ? `Added ${n} synthetic intake patient(s).` : "Synthetic intake patients already exist.";
  }
  await logAudit(cols, staff, `demo.${kind}`, "settings", undefined, message);
  revalidatePath("/", "layout");
  return { ok: true, message };
}
