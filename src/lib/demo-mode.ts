import type { PatientRow, SeriesPoint } from "./queries";
import type { ReadingType } from "./types";

const TWO_DAYS = 48 * 60 * 60 * 1000;

export function demoDataEnabled() {
  return process.env.DEMO_DATA === "true";
}

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function demoCenter(existing?: { lat: number; lng: number }) {
  if (existing) return existing;
  const lat = Number(process.env.DEMO_CENTER_LAT);
  const lng = Number(process.env.DEMO_CENTER_LNG);
  return {
    lat: Number.isFinite(lat) && lat !== 0 ? lat : 18.5204,
    lng: Number.isFinite(lng) && lng !== 0 ? lng : 73.8567,
  };
}

export interface DemoVitals {
  latest: Partial<Record<ReadingType, { value: number; at: string }>>;
  series: Partial<Record<ReadingType, SeriesPoint[]>>;
  locations: { lat: number; lng: number; at: string; accuracy?: number }[];
  lastSyncAt: string;
}

/** Stable 48-hour history so the dashboard does not jump on every refresh. */
export function buildDemoVitals(patientId: string, existingLocation?: { lat: number; lng: number }): DemoVitals {
  const rnd = mulberry32(hash(patientId));
  const now = Math.floor(Date.now() / (5 * 60_000)) * 5 * 60_000;
  const start = now - TWO_DAYS;
  const center = demoCenter(existingLocation);
  const series: Partial<Record<ReadingType, SeriesPoint[]>> = {
    heart_rate: [],
    resting_heart_rate: [],
    hrv: [],
    spo2: [],
    steps: [],
    active_energy: [],
    sleep_hours: [],
    respiratory_rate: [],
  };
  const locations: DemoVitals["locations"] = [];

  for (let t = start; t <= now; t += 15 * 60_000) {
    const hour = new Date(t).getHours();
    const asleep = hour < 6 || hour >= 23;
    const hr = Math.round((asleep ? 58 : 70) + Math.sin(t / 3_600_000) * (asleep ? 3 : 8) + rnd() * 4);
    series.heart_rate!.push({ t, v: hr });
  }

  const firstMidnight = new Date(start);
  firstMidnight.setHours(0, 0, 0, 0);
  for (let day = firstMidnight.getTime(); day <= now; day += 24 * 3600_000) {
    let steps = 0;
    let energy = 0;
    for (let hour = 7; hour <= 21; hour++) {
      const t = day + hour * 3600_000;
      if (t < start || t > now) continue;
      steps += Math.round(350 + rnd() * 500);
      energy += Math.round(18 + rnd() * 25);
      series.steps!.push({ t, v: steps });
      series.active_energy!.push({ t, v: energy });
    }
    const wake = day + 7 * 3600_000;
    if (wake >= start && wake <= now) {
      series.resting_heart_rate!.push({ t: wake, v: Math.round(58 + rnd() * 6) });
      series.sleep_hours!.push({ t: wake, v: Math.round((6.4 + rnd() * 1.4) * 10) / 10 });
    }
  }

  for (let day = firstMidnight.getTime(); day <= now; day += 4 * 3600_000) {
    if (day < start) continue;
    series.hrv!.push({ t: day, v: Math.round(34 + rnd() * 22) });
    series.spo2!.push({ t: day, v: Math.round(96 + rnd() * 3) });
    series.respiratory_rate!.push({ t: day, v: Math.round(13 + rnd() * 4) });
  }

  for (let t = start, i = 0; t <= now; t += 30 * 60_000, i++) {
    locations.push({
      lat: Math.round((center.lat + Math.sin(i / 7) * 0.006) * 1e5) / 1e5,
      lng: Math.round((center.lng + Math.cos(i / 7) * 0.006) * 1e5) / 1e5,
      at: new Date(t).toISOString(),
      accuracy: 12,
    });
  }
  locations.reverse();

  const latest = {} as DemoVitals["latest"];
  for (const [type, points] of Object.entries(series) as [ReadingType, SeriesPoint[]][]) {
    const last = points[points.length - 1];
    if (last) latest[type] = { value: last.v, at: new Date(last.t).toISOString() };
  }

  return { latest, series, locations, lastSyncAt: new Date(now).toISOString() };
}

export function applyDemoRow(row: PatientRow): PatientRow {
  if (!demoDataEnabled() || row.isSynthetic) return row;
  const demo = buildDemoVitals(row.id, row.lastLocation);
  const hr = demo.latest.heart_rate;
  const loc = demo.locations[0];
  return {
    ...row,
    wearableStatus: "active",
    online: true,
    lastSyncAt: demo.lastSyncAt,
    deviceLabel: row.deviceLabel || "Apple Watch SE + iPhone 14",
    heartRate: hr ? { value: hr.value, at: hr.at } : row.heartRate,
    steps: demo.latest.steps?.value ?? row.steps,
    spo2: demo.latest.spo2?.value ?? row.spo2,
    lastLocation: loc ? { lat: loc.lat, lng: loc.lng, at: loc.at } : row.lastLocation,
    outsideSafeZone: false,
  };
}
