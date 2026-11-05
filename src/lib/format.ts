import type { AlertType, ReadingType, WearableStatus } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function ageFrom(dob: Date | string) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function programDay(admissionDate: Date | string) {
  return Math.max(1, Math.floor((Date.now() - new Date(admissionDate).getTime()) / DAY_MS) + 1);
}

export function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function initials(p: { firstName: string; lastName: string }) {
  return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase();
}

export const READING_META: Record<ReadingType, { label: string; unit: string; decimals: number }> = {
  heart_rate: { label: "Heart rate", unit: "bpm", decimals: 0 },
  resting_heart_rate: { label: "Resting HR", unit: "bpm", decimals: 0 },
  hrv: { label: "HRV (SDNN)", unit: "ms", decimals: 0 },
  spo2: { label: "Blood oxygen", unit: "%", decimals: 0 },
  steps: { label: "Steps today", unit: "steps", decimals: 0 },
  active_energy: { label: "Active energy", unit: "kcal", decimals: 0 },
  sleep_hours: { label: "Sleep (last night)", unit: "h", decimals: 1 },
  respiratory_rate: { label: "Respiratory rate", unit: "br/min", decimals: 0 },
};

export const ALERT_LABELS: Record<AlertType, string> = {
  hr_high: "High heart rate",
  hr_low: "Low heart rate",
  spo2_low: "Low blood oxygen",
  geofence_exit: "Left safe zone",
  geofence_enter: "Entered restricted area",
  no_data: "No data from device",
};

export const WEARABLE_LABELS: Record<WearableStatus, string> = {
  not_paired: "Not paired",
  pending: "Awaiting first sync",
  active: "Active",
  revoked: "Revoked",
};

export function formatValue(type: ReadingType, value: number) {
  const meta = READING_META[type];
  return value.toLocaleString("en-US", {
    maximumFractionDigits: meta.decimals,
    minimumFractionDigits: meta.decimals,
  });
}

export function isOnline(lastSyncAt: Date | string | undefined, noDataMinutes: number) {
  if (!lastSyncAt) return false;
  return Date.now() - new Date(lastSyncAt).getTime() < noDataMinutes * 60 * 1000;
}
