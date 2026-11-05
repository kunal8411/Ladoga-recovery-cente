import type { AnyBulkWriteOperation } from "mongodb";
import { autoResolveNoData, evaluateLocation, evaluateReadings } from "./alerts";
import { READING_META } from "./format";
import type { Collections } from "./mongodb";
import { effectiveThresholds, getAlertRules } from "./settings";
import type { DataSource, PatientDoc, ReadingDoc, ReadingType } from "./types";

/** Payload field name -> reading type. Field names are what the iOS Shortcut sends. */
const FIELD_MAP: Record<string, ReadingType> = {
  heartRate: "heart_rate",
  restingHeartRate: "resting_heart_rate",
  hrv: "hrv",
  spo2: "spo2",
  steps: "steps",
  activeEnergy: "active_energy",
  sleepHours: "sleep_hours",
  respiratoryRate: "respiratory_rate",
};

const VALID_RANGES: Record<ReadingType, [number, number]> = {
  heart_rate: [20, 250],
  resting_heart_rate: [20, 200],
  hrv: [1, 500],
  spo2: [50, 100],
  steps: [0, 200_000],
  active_energy: [0, 20_000],
  sleep_hours: [0, 24],
  respiratory_rate: [3, 80],
};

/** Shortcuts sends numbers as strings, sometimes with units or comma decimals ("72 BPM", "97,5"). */
export function parseNumber(input: unknown): number | undefined {
  if (typeof input === "number") return Number.isFinite(input) ? input : undefined;
  if (typeof input !== "string") return undefined;
  const match = input.replace(/\s/g, "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : undefined;
}

function parseDate(input: unknown): Date | undefined {
  if (typeof input !== "string" && typeof input !== "number") return undefined;
  const raw = typeof input === "string" ? input.replace(" at ", " ").trim() : input;
  if (raw === "") return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = Date.now();
  if (d.getTime() > now + 5 * 60_000 || d.getTime() < now - 30 * 24 * 3600_000) return undefined;
  return d;
}

function normalize(type: ReadingType, value: number) {
  if (type === "spo2" && value > 0 && value <= 1) return value * 100;
  return value;
}

export interface IngestResult {
  readingsStored: number;
  locationStored: boolean;
  alertsCreated: number;
  ignored: string[];
}

export async function processIngest(
  cols: Collections,
  patient: PatientDoc,
  rawBody: Record<string, unknown>,
  source: DataSource,
): Promise<IngestResult> {
  const now = new Date();
  const body = { ...rawBody };
  const sleepMinutes = parseNumber(body.sleepMinutes);
  if ((body.sleepHours === undefined || body.sleepHours === "") && sleepMinutes !== undefined) {
    body.sleepHours = sleepMinutes / 60;
  }
  const ignored: string[] = [];
  const parsed: { type: ReadingType; value: number; recordedAt: Date }[] = [];
  const fallbackAt = parseDate(body.recordedAt) ?? now;

  for (const [field, type] of Object.entries(FIELD_MAP)) {
    if (body[field] === undefined || body[field] === "" || body[field] === null) continue;
    const raw = parseNumber(body[field]);
    if (raw === undefined) {
      ignored.push(field);
      continue;
    }
    const value = normalize(type, raw);
    const [min, max] = VALID_RANGES[type];
    if (value < min || value > max) {
      ignored.push(field);
      continue;
    }
    parsed.push({ type, value, recordedAt: parseDate(body[`${field}At`]) ?? fallbackAt });
  }

  if (Array.isArray(body.readings)) {
    for (const item of body.readings as Record<string, unknown>[]) {
      const type = item?.type as ReadingType;
      const raw = parseNumber(item?.value);
      if (!type || !(type in READING_META) || raw === undefined) continue;
      const value = normalize(type, raw);
      const [min, max] = VALID_RANGES[type];
      if (value < min || value > max) continue;
      parsed.push({ type, value, recordedAt: parseDate(item.recordedAt) ?? fallbackAt });
    }
  }

  if (parsed.length > 0) {
    const ops: AnyBulkWriteOperation<ReadingDoc>[] = parsed.map((r) => ({
      updateOne: {
        filter: { patientId: patient._id, type: r.type, recordedAt: r.recordedAt },
        update: {
          $set: { value: r.value, unit: READING_META[r.type].unit, source },
          $setOnInsert: { patientId: patient._id, type: r.type, recordedAt: r.recordedAt, receivedAt: now },
        },
        upsert: true,
      },
    }));
    await cols.readings.bulkWrite(ops, { ordered: false });
  }

  const lat = parseNumber(body.latitude);
  const lng = parseNumber(body.longitude);
  const point =
    lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
      ? { lat, lng }
      : null;
  const hasLocation = point !== null;
  const accuracy = parseNumber(body.accuracy);
  const locationAt = parseDate(body.locationAt) ?? now;
  if (point) {
    await cols.locations.insertOne({
      patientId: patient._id,
      ...point,
      accuracy,
      recordedAt: locationAt,
      receivedAt: now,
      source,
    });
  }

  const latestUpdate: Record<string, unknown> = {};
  const latestValues: Partial<Record<ReadingType, number>> = {};
  for (const r of parsed) {
    const current = patient.latest?.[r.type];
    if (!current || new Date(current.at) <= r.recordedAt) {
      latestUpdate[`latest.${r.type}`] = { value: r.value, at: r.recordedAt };
      latestValues[r.type] = r.value;
    }
  }

  const deviceLabel = typeof body.deviceLabel === "string" && body.deviceLabel.trim() ? body.deviceLabel.trim().slice(0, 60) : undefined;
  await cols.patients.updateOne(
    { _id: patient._id },
    {
      $set: {
        ...latestUpdate,
        ...(point ? { lastLocation: { ...point, accuracy, at: locationAt } } : {}),
        "wearable.status": "active",
        "wearable.lastSyncAt": now,
        "wearable.source": source,
        ...(deviceLabel ? { "wearable.deviceLabel": deviceLabel } : {}),
        updatedAt: now,
      },
    },
  );

  await autoResolveNoData(cols, patient._id);

  const rules = await getAlertRules(cols);
  const thresholds = effectiveThresholds(patient, rules);
  let alertsCreated = await evaluateReadings(cols, patient, latestValues, thresholds);
  if (point) alertsCreated += await evaluateLocation(cols, patient, point);

  return { readingsStored: parsed.length, locationStored: hasLocation, alertsCreated, ignored };
}
