"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { getCollections } from "@/lib/mongodb";

async function transition(formData: FormData, to: "acknowledged" | "resolved") {
  const staff = await requireStaff();
  const id = String(formData.get("alertId") ?? "");
  if (!ObjectId.isValid(id)) return;
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const cols = await getCollections();
  const now = new Date();
  const set =
    to === "acknowledged"
      ? { status: to, acknowledgedAt: now, acknowledgedBy: staff.name }
      : { status: to, resolvedAt: now, resolvedBy: staff.name };
  await cols.alerts.updateOne(
    { _id: new ObjectId(id), status: { $ne: "resolved" } },
    { $set: { ...set, ...(note ? { note } : {}) } },
  );
  await logAudit(cols, staff, `alert.${to}`, "alert", id, note || undefined);
  revalidatePath("/", "layout");
}

export async function acknowledgeAlert(formData: FormData) {
  await transition(formData, "acknowledged");
}

export async function resolveAlert(formData: FormData) {
  await transition(formData, "resolved");
}
