import "server-only";
import { ObjectId, type Filter } from "mongodb";
import { ageFrom, fullName, isOnline, programDay } from "./format";
import { getCollections, type Collections } from "./mongodb";
import { effectiveThresholds, getAlertRules } from "./settings";
import type { AlertDoc, AlertStatus, AlertThresholds, GeofenceDoc, PatientDoc, ReadingType } from "./types";

export interface PatientRow {
  id: string;
  mrn: string;
  name: string;
  firstName: string;
  lastName: string;
  age: number;
  gender?: string;
  program: string;
  admissionDate: string;
  programDay: number;
  programLengthDays: number;
  clinician?: string;
  isSynthetic: boolean;
  wearableStatus: PatientDoc["wearable"]["status"];
  deviceLabel?: string;
  lastSyncAt?: string;
  online: boolean;
  heartRate?: { value: number; at: string };
  steps?: number;
  spo2?: number;
  openAlerts: number;
  lastLocation?: { lat: number; lng: number; at: string };
  outsideSafeZone: boolean;
}

export interface AlertRow {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  type: AlertDoc["type"];
  severity: AlertDoc["severity"];
  title: string;
  message: string;
  value?: number;
  unit?: string;
  location?: { lat: number; lng: number };
  status: AlertStatus;
  createdAt: string;
  lastTriggeredAt: string;
  triggerCount: number;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  note?: string;
}

const iso = (d?: Date) => (d ? new Date(d).toISOString() : undefined);

export function toAlertRow(a: AlertDoc): AlertRow {
  return {
    id: a._id.toString(),
    patientId: a.patientId.toString(),
    patientName: a.patientName,
    mrn: a.mrn,
    type: a.type,
    severity: a.severity,
    title: a.title,
    message: a.message,
    value: a.value,
    unit: a.unit,
    location: a.location,
    status: a.status,
    createdAt: iso(a.createdAt)!,
    lastTriggeredAt: iso(a.lastTriggeredAt ?? a.createdAt)!,
    triggerCount: a.triggerCount ?? 1,
    acknowledgedAt: iso(a.acknowledgedAt),
    acknowledgedBy: a.acknowledgedBy,
    resolvedAt: iso(a.resolvedAt),
    resolvedBy: a.resolvedBy,
    note: a.note,
  };
}

function outsideAnySafeZone(p: PatientDoc, safeFenceIds: Set<string>) {
  return Object.entries(p.geofenceState ?? {}).some(([id, inside]) => safeFenceIds.has(id) && !inside);
}

async function buildRows(cols: Collections, patients: PatientDoc[], rules: AlertThresholds) {
  const ids = patients.map((p) => p._id);
  const [alertCounts, safeFences] = await Promise.all([
    cols.alerts
      .aggregate<{ _id: ObjectId; count: number }>([
        { $match: { patientId: { $in: ids }, status: { $in: ["active", "acknowledged"] } } },
        { $group: { _id: "$patientId", count: { $sum: 1 } } },
      ])
      .toArray(),
    cols.geofences.find({ patientId: { $in: ids }, kind: "safe", active: true }, { projection: { _id: 1 } }).toArray(),
  ]);
  const countMap = new Map(alertCounts.map((c) => [c._id.toString(), c.count]));
  const safeIds = new Set(safeFences.map((f) => f._id.toString()));

  return patients.map<PatientRow>((p) => {
    const t = effectiveThresholds(p, rules);
    const hr = p.latest?.heart_rate;
    return {
      id: p._id.toString(),
      mrn: p.mrn,
      name: fullName(p),
      firstName: p.firstName,
      lastName: p.lastName,
      age: ageFrom(p.dateOfBirth),
      gender: p.gender,
      program: p.program,
      admissionDate: iso(p.admissionDate)!,
      programDay: programDay(p.admissionDate),
      programLengthDays: p.programLengthDays,
      clinician: p.assignedClinician,
      isSynthetic: p.isSynthetic,
      wearableStatus: p.wearable?.status ?? "not_paired",
      deviceLabel: p.wearable?.deviceLabel,
      lastSyncAt: iso(p.wearable?.lastSyncAt),
      online: isOnline(p.wearable?.lastSyncAt, t.noDataMinutes),
      heartRate: hr ? { value: hr.value, at: iso(hr.at)! } : undefined,
      steps: p.latest?.steps?.value,
      spo2: p.latest?.spo2?.value,
      openAlerts: countMap.get(p._id.toString()) ?? 0,
      lastLocation: p.lastLocation ? { lat: p.lastLocation.lat, lng: p.lastLocation.lng, at: iso(p.lastLocation.at)! } : undefined,
      outsideSafeZone: outsideAnySafeZone(p, safeIds),
    };
  });
}

export async function listPatients() {
  const cols = await getCollections();
  const [patients, rules] = await Promise.all([
    cols.patients.find({}).sort({ "wearable.status": 1, lastName: 1 }).toArray(),
    getAlertRules(cols),
  ]);
  const rows = await buildRows(cols, patients, rules);
  const statusOrder = { active: 0, pending: 1, revoked: 2, not_paired: 3 };
  return rows.sort((a, b) => statusOrder[a.wearableStatus] - statusOrder[b.wearableStatus] || a.lastName.localeCompare(b.lastName));
}

export async function getDashboardData() {
  const cols = await getCollections();
  const rows = await listPatients();
  const [activeAlerts, acknowledgedAlerts, recentAlerts, alertsToday] = await Promise.all([
    cols.alerts.countDocuments({ status: "active" }),
    cols.alerts.countDocuments({ status: "acknowledged" }),
    cols.alerts.find({ status: { $in: ["active", "acknowledged"] } }).sort({ lastTriggeredAt: -1 }).limit(8).toArray(),
    cols.alerts.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 3600_000) } }),
  ]);

  const paired = rows.filter((r) => r.wearableStatus === "active" || r.wearableStatus === "pending");
  const recentHr = rows
    .filter((r) => r.heartRate && Date.now() - new Date(r.heartRate.at).getTime() < 6 * 3600_000)
    .map((r) => r.heartRate!.value);

  return {
    rows,
    stats: {
      totalPatients: rows.length,
      activeWearables: rows.filter((r) => r.wearableStatus === "active").length,
      pendingWearables: rows.filter((r) => r.wearableStatus === "pending").length,
      onlineDevices: paired.filter((r) => r.online).length,
      offlineDevices: paired.filter((r) => !r.online).length,
      activeAlerts,
      acknowledgedAlerts,
      alertsToday,
      outsideSafeZone: rows.filter((r) => r.outsideSafeZone).length,
      avgHeartRate: recentHr.length ? Math.round(recentHr.reduce((a, b) => a + b, 0) / recentHr.length) : undefined,
      avgProgramDay: rows.length ? Math.round(rows.reduce((a, r) => a + r.programDay, 0) / rows.length) : 0,
    },
    recentAlerts: recentAlerts.map(toAlertRow),
  };
}

export async function listAlerts(status?: AlertStatus | "open") {
  const cols = await getCollections();
  const filter: Filter<AlertDoc> =
    status === "open" ? { status: { $in: ["active", "acknowledged"] } } : status ? { status } : {};
  const alerts = await cols.alerts.find(filter).sort({ lastTriggeredAt: -1 }).limit(200).toArray();
  const counts = await cols.alerts
    .aggregate<{ _id: AlertStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    .toArray();
  return {
    alerts: alerts.map(toAlertRow),
    counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) as Partial<Record<AlertStatus, number>>,
  };
}

export interface SeriesPoint {
  t: number;
  v: number;
}

export interface GeofenceView {
  id: string;
  name: string;
  kind: GeofenceDoc["kind"];
  lat: number;
  lng: number;
  radiusMeters: number;
  inside?: boolean;
}

export async function getPatientDetail(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const cols = await getCollections();
  const patient = await cols.patients.findOne({ _id: new ObjectId(id) });
  if (!patient) return null;

  const since7d = new Date(Date.now() - 7 * 24 * 3600_000);
  const since48h = new Date(Date.now() - 48 * 3600_000);
  const [rules, readings, locations, geofences, alerts] = await Promise.all([
    getAlertRules(cols),
    cols.readings.find({ patientId: patient._id, recordedAt: { $gte: since7d } }).sort({ recordedAt: 1 }).toArray(),
    cols.locations.find({ patientId: patient._id, recordedAt: { $gte: since48h } }).sort({ recordedAt: -1 }).limit(300).toArray(),
    cols.geofences.find({ patientId: patient._id, active: true }).toArray(),
    cols.alerts.find({ patientId: patient._id }).sort({ lastTriggeredAt: -1 }).limit(50).toArray(),
  ]);

  const series: Partial<Record<ReadingType, SeriesPoint[]>> = {};
  for (const r of readings) {
    (series[r.type] ??= []).push({ t: new Date(r.recordedAt).getTime(), v: r.value });
  }

  const [row] = await buildRows(cols, [patient], rules);
  const thresholds = effectiveThresholds(patient, rules);

  return {
    row,
    profile: {
      dateOfBirth: iso(patient.dateOfBirth)!,
      phone: patient.phone,
      primaryConcern: patient.primaryConcern,
      emergencyContact: patient.emergencyContact,
      consentGiven: patient.consentGiven,
      consentDate: iso(patient.consentDate),
      notes: patient.notes,
      createdAt: iso(patient.createdAt)!,
      activatedAt: iso(patient.wearable?.activatedAt),
      keyHint: patient.wearable?.keyHint,
      source: patient.wearable?.source,
    },
    latest: Object.fromEntries(
      Object.entries(patient.latest ?? {}).map(([k, v]) => [k, { value: v!.value, at: iso(v!.at)! }]),
    ) as Partial<Record<ReadingType, { value: number; at: string }>>,
    series,
    locations: locations.map((l) => ({ lat: l.lat, lng: l.lng, at: iso(l.recordedAt)!, accuracy: l.accuracy })),
    geofences: geofences.map<GeofenceView>((g) => ({
      id: g._id.toString(),
      name: g.name,
      kind: g.kind,
      lat: g.lat,
      lng: g.lng,
      radiusMeters: g.radiusMeters,
      inside: patient.geofenceState?.[g._id.toString()],
    })),
    alerts: alerts.map(toAlertRow),
    thresholds,
    rules,
    overrides: patient.thresholdOverrides ?? {},
  };
}

export type PatientDetail = NonNullable<Awaited<ReturnType<typeof getPatientDetail>>>;

export async function listAuditLogs(limit = 200) {
  const cols = await getCollections();
  const logs = await cols.auditLogs.find({}).sort({ at: -1 }).limit(limit).toArray();
  return logs.map((l) => ({
    id: l._id!.toString(),
    actorName: l.actorName,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    details: l.details,
    at: iso(l.at)!,
  }));
}
