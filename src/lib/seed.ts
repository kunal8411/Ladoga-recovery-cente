import type { Collections } from "./mongodb";
import type { PatientDoc, ReadingDoc, ReadingType } from "./types";
import { READING_META } from "./format";

const DAY = 24 * 3600_000;

export async function nextMrn(cols: Collections) {
  const last = await cols.patients.find({}, { projection: { mrn: 1 } }).sort({ mrn: -1 }).limit(1).toArray();
  const n = last[0] ? parseInt(last[0].mrn.replace(/\D/g, ""), 10) + 1 : 1001;
  return `RS-${n}`;
}

function demoCenter() {
  return {
    lat: Number(process.env.DEMO_CENTER_LAT) || 30.2672,
    lng: Number(process.env.DEMO_CENTER_LNG) || -97.7431,
  };
}

function yearsAgo(years: number) {
  return new Date(Date.now() - (years * 365.25 + 45) * DAY);
}

const INTAKE: Omit<PatientDoc, "_id" | "mrn" | "createdAt" | "updatedAt" | "wearable" | "isSynthetic">[] = [
  { firstName: "Jordan", lastName: "Miles", dateOfBirth: yearsAgo(34), gender: "Male", admissionDate: new Date(Date.now() - 11 * DAY), programLengthDays: 30, program: "Residential", primaryConcern: "Alcohol use disorder", assignedClinician: "Dr. Sarah Lin", phone: "(555) 010-2231", emergencyContact: { name: "Dana Miles", phone: "(555) 010-8890", relation: "Sister" }, consentGiven: true, consentDate: new Date(Date.now() - 11 * DAY) },
  { firstName: "Avery", lastName: "Chen", dateOfBirth: yearsAgo(27), gender: "Female", admissionDate: new Date(Date.now() - 40 * DAY), programLengthDays: 90, program: "Intensive Outpatient (IOP)", primaryConcern: "Opioid use disorder", assignedClinician: "Mark Alvarez, LCSW", phone: "(555) 010-4410", emergencyContact: { name: "Grace Chen", phone: "(555) 010-7712", relation: "Mother" }, consentGiven: true, consentDate: new Date(Date.now() - 40 * DAY) },
  { firstName: "Marcus", lastName: "Reed", dateOfBirth: yearsAgo(45), gender: "Male", admissionDate: new Date(Date.now() - 4 * DAY), programLengthDays: 60, program: "Residential", primaryConcern: "Stimulant use disorder", assignedClinician: "Dr. Sarah Lin", phone: "(555) 010-3378", emergencyContact: { name: "Tanya Reed", phone: "(555) 010-5521", relation: "Spouse" }, consentGiven: false },
  { firstName: "Priya", lastName: "Natarajan", dateOfBirth: yearsAgo(31), gender: "Female", admissionDate: new Date(Date.now() - 62 * DAY), programLengthDays: 90, program: "Outpatient", primaryConcern: "Alcohol use disorder", assignedClinician: "Mark Alvarez, LCSW", phone: "(555) 010-9045", emergencyContact: { name: "Ravi Natarajan", phone: "(555) 010-6634", relation: "Brother" }, consentGiven: true, consentDate: new Date(Date.now() - 62 * DAY) },
  { firstName: "Elena", lastName: "Ruiz", dateOfBirth: yearsAgo(52), gender: "Female", admissionDate: new Date(Date.now() - 20 * DAY), programLengthDays: 30, program: "Residential", primaryConcern: "Benzodiazepine dependence", assignedClinician: "Dr. Kevin Osei", phone: "(555) 010-1187", emergencyContact: { name: "Luis Ruiz", phone: "(555) 010-2290", relation: "Son" }, consentGiven: true, consentDate: new Date(Date.now() - 20 * DAY) },
];

export async function seedIntakePatients(cols: Collections) {
  let created = 0;
  for (const p of INTAKE) {
    const exists = await cols.patients.findOne({ firstName: p.firstName, lastName: p.lastName, isSynthetic: true });
    if (exists) continue;
    const now = new Date();
    await cols.patients.insertOne({
      ...p,
      mrn: await nextMrn(cols),
      isSynthetic: true,
      wearable: { status: "not_paired" },
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
    } as PatientDoc);
    created++;
  }
  return created;
}

/** A fully simulated wearable patient with 7 days of history, geofences and alerts. */
export async function seedSimulatedPatient(cols: Collections) {
  const existing = await cols.patients.findOne({ lastName: "Brooks", firstName: "Taylor", isSynthetic: true });
  if (existing) return 0;

  const now = Date.now();
  const center = demoCenter();
  const insert = await cols.patients.insertOne({
    mrn: await nextMrn(cols),
    firstName: "Taylor",
    lastName: "Brooks",
    dateOfBirth: yearsAgo(29),
    gender: "Non-binary",
    admissionDate: new Date(now - 16 * DAY),
    programLengthDays: 45,
    program: "Residential",
    primaryConcern: "Alcohol use disorder",
    assignedClinician: "Dr. Kevin Osei",
    phone: "(555) 010-7781",
    emergencyContact: { name: "Morgan Brooks", phone: "(555) 010-3345", relation: "Parent" },
    consentGiven: true,
    consentDate: new Date(now - 16 * DAY),
    notes: "Simulated wearable patient for demonstrating multi-patient monitoring. Not real data.",
    isSynthetic: true,
    wearable: {
      status: "active",
      deviceLabel: "Apple Watch Series 9 (simulated)",
      activatedAt: new Date(now - 7 * DAY),
      lastSyncAt: new Date(now - 4 * 60_000),
      source: "simulated",
    },
    createdAt: new Date(now - 16 * DAY),
    updatedAt: new Date(),
    createdBy: "seed",
  } as PatientDoc);
  const patientId = insert.insertedId;

  const readings: ReadingDoc[] = [];
  const add = (type: ReadingType, value: number, t: number) =>
    readings.push({ patientId, type, value: Math.round(value * 10) / 10, unit: READING_META[type].unit, recordedAt: new Date(t), receivedAt: new Date(t), source: "simulated" });

  const start = now - 7 * DAY;
  for (let t = start; t <= now - 5 * 60_000; t += 10 * 60_000) {
    const hour = new Date(t).getHours();
    const asleep = hour < 6 || hour >= 23;
    let hr = asleep ? 58 + Math.random() * 6 : 72 + Math.random() * 14;
    if (!asleep && Math.random() < 0.04) hr = 105 + Math.random() * 25;
    add("heart_rate", hr, t);
  }
  add("heart_rate", 128, now - 50 * 60_000);
  add("heart_rate", 84, now - 6 * 60_000);

  for (let d = 6; d >= 0; d--) {
    const dayStart = new Date(now - d * DAY);
    dayStart.setHours(7, 0, 0, 0);
    add("resting_heart_rate", 60 + Math.random() * 5, dayStart.getTime());
    add("sleep_hours", 5.5 + Math.random() * 2.5, dayStart.getTime());
    for (let h = 0; h < 4; h++) add("hrv", 38 + Math.random() * 22, dayStart.getTime() + h * 4 * 3600_000);
    for (let h = 1; h <= 3; h++) add("spo2", 95 + Math.random() * 3, dayStart.getTime() + h * 5 * 3600_000);
    const steps = 6000 + Math.random() * 6000;
    for (let h = 1; h <= 14; h++) {
      const t = dayStart.getTime() + h * 3600_000;
      if (t > now) break;
      add("steps", (steps * h) / 14, t);
    }
  }
  await cols.readings.insertMany(readings);

  const locations = [];
  for (let t = now - 48 * 3600_000; t <= now; t += 30 * 60_000) {
    const wander = (Math.random() - 0.5) * 0.004;
    locations.push({ patientId, lat: center.lat + wander, lng: center.lng + (Math.random() - 0.5) * 0.004, recordedAt: new Date(t), receivedAt: new Date(t), source: "simulated" as const });
  }
  const last = { lat: center.lat + 0.0085, lng: center.lng + 0.006 };
  locations.push({ patientId, ...last, recordedAt: new Date(now - 5 * 60_000), receivedAt: new Date(now - 5 * 60_000), source: "simulated" as const });
  await cols.locations.insertMany(locations);

  const safe = await cols.geofences.insertOne({ patientId, name: "Treatment center campus", kind: "safe", lat: center.lat, lng: center.lng, radiusMeters: 600, active: true, createdAt: new Date(), createdBy: "seed" } as never);
  const restricted = await cols.geofences.insertOne({ patientId, name: "Downtown bar district (example)", kind: "restricted", lat: center.lat - 0.012, lng: center.lng - 0.01, radiusMeters: 350, active: true, createdAt: new Date(), createdBy: "seed" } as never);

  const latestOf = (type: ReadingType) => {
    const r = readings.filter((x) => x.type === type).sort((a, b) => +b.recordedAt - +a.recordedAt)[0];
    return r ? { value: r.value, at: r.recordedAt } : undefined;
  };
  await cols.patients.updateOne(
    { _id: patientId },
    {
      $set: {
        latest: Object.fromEntries((Object.keys(READING_META) as ReadingType[]).map((t) => [t, latestOf(t)]).filter(([, v]) => v)),
        lastLocation: { ...last, at: new Date(now - 5 * 60_000) },
        geofenceState: { [safe.insertedId.toString()]: false, [restricted.insertedId.toString()]: false },
      },
    },
  );

  const base = { patientId, patientName: "Taylor Brooks", mrn: (await cols.patients.findOne({ _id: patientId }))!.mrn };
  await cols.alerts.insertMany([
    { ...base, type: "geofence_exit", severity: "warning", title: "Left safe zone", message: 'Left the "Treatment center campus" safe zone.', location: last, geofenceId: safe.insertedId, status: "active", createdAt: new Date(now - 5 * 60_000), lastTriggeredAt: new Date(now - 5 * 60_000), triggerCount: 1 },
    { ...base, type: "hr_high", severity: "warning", title: "High heart rate", message: "Heart rate 128 bpm is above the 120 bpm threshold.", value: 128, unit: "bpm", status: "acknowledged", createdAt: new Date(now - 50 * 60_000), lastTriggeredAt: new Date(now - 50 * 60_000), triggerCount: 1, acknowledgedAt: new Date(now - 40 * 60_000), acknowledgedBy: "Dr. Kevin Osei", note: "Patient was in gym session." },
  ] as never[]);

  return 1;
}

export async function removeSyntheticData(cols: Collections) {
  const synthetic = await cols.patients.find({ isSynthetic: true }, { projection: { _id: 1 } }).toArray();
  const ids = synthetic.map((p) => p._id);
  await Promise.all([
    cols.readings.deleteMany({ patientId: { $in: ids } }),
    cols.locations.deleteMany({ patientId: { $in: ids } }),
    cols.geofences.deleteMany({ patientId: { $in: ids } }),
    cols.alerts.deleteMany({ patientId: { $in: ids } }),
  ]);
  const res = await cols.patients.deleteMany({ _id: { $in: ids } });
  return res.deletedCount;
}
