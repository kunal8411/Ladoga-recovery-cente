"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { getCollections } from "@/lib/mongodb";
import { nextMrn } from "@/lib/seed";
import type { AlertThresholds, PatientDoc } from "@/lib/types";

export interface ActionState {
  ok: boolean;
  message?: string;
}

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined));

const patientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  dateOfBirth: z.coerce.date({ error: "Date of birth is required" }),
  gender: optionalText,
  admissionDate: z.coerce.date({ error: "Admission date is required" }),
  programLengthDays: z.coerce.number().int().min(1).max(730),
  program: z.string().trim().min(1).max(60),
  primaryConcern: optionalText,
  assignedClinician: optionalText,
  phone: optionalText,
  emergencyName: optionalText,
  emergencyPhone: optionalText,
  emergencyRelation: optionalText,
  notes: z.string().trim().max(2000).optional(),
  consentGiven: z.literal("on").optional(),
});

export async function createPatient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  if (d.dateOfBirth > new Date()) return { ok: false, message: "Date of birth can't be in the future." };

  const cols = await getCollections();
  const now = new Date();
  const doc: Omit<PatientDoc, "_id"> = {
    mrn: await nextMrn(cols),
    firstName: d.firstName,
    lastName: d.lastName,
    dateOfBirth: d.dateOfBirth,
    gender: d.gender,
    admissionDate: d.admissionDate,
    programLengthDays: d.programLengthDays,
    program: d.program,
    primaryConcern: d.primaryConcern,
    assignedClinician: d.assignedClinician,
    phone: d.phone,
    emergencyContact: d.emergencyName ? { name: d.emergencyName, phone: d.emergencyPhone ?? "", relation: d.emergencyRelation } : undefined,
    consentGiven: d.consentGiven === "on",
    consentDate: d.consentGiven === "on" ? now : undefined,
    notes: d.notes || undefined,
    isSynthetic: false,
    wearable: { status: "not_paired" },
    createdAt: now,
    updatedAt: now,
    createdBy: staff.id,
  };
  const res = await cols.patients.insertOne(doc as PatientDoc);
  await logAudit(cols, staff, "patient.created", "patient", res.insertedId.toString(), doc.mrn);
  revalidatePath("/", "layout");
  redirect(`/patients/${res.insertedId.toString()}`);
}

const thresholdField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v) : undefined))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0 && v <= 10000), "Invalid number");

export async function updatePatientThresholds(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  const id = String(formData.get("patientId") ?? "");
  if (!ObjectId.isValid(id)) return { ok: false, message: "Invalid patient." };
  const parsed = z
    .object({ hrHigh: thresholdField, hrLow: thresholdField, spo2Low: thresholdField, noDataMinutes: thresholdField })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  const overrides = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  ) as Partial<AlertThresholds>;
  if (overrides.hrHigh !== undefined && overrides.hrLow !== undefined && overrides.hrLow >= overrides.hrHigh) {
    return { ok: false, message: "Low heart rate must be below high heart rate." };
  }

  const cols = await getCollections();
  await cols.patients.updateOne({ _id: new ObjectId(id) }, { $set: { thresholdOverrides: overrides, updatedAt: new Date() } });
  await logAudit(cols, staff, "patient.thresholds_updated", "patient", id, JSON.stringify(overrides));
  revalidatePath("/", "layout");
  return { ok: true, message: "Thresholds saved." };
}

export async function deletePatient(formData: FormData) {
  const staff = await requireAdmin();
  const id = String(formData.get("patientId") ?? "");
  if (!ObjectId.isValid(id)) return;
  const _id = new ObjectId(id);
  const cols = await getCollections();
  const patient = await cols.patients.findOne({ _id });
  if (!patient) return;
  await Promise.all([
    cols.readings.deleteMany({ patientId: _id }),
    cols.locations.deleteMany({ patientId: _id }),
    cols.geofences.deleteMany({ patientId: _id }),
    cols.alerts.deleteMany({ patientId: _id }),
  ]);
  await cols.patients.deleteOne({ _id });
  await logAudit(cols, staff, "patient.deleted", "patient", id, patient.mrn);
  revalidatePath("/", "layout");
  redirect("/patients");
}
