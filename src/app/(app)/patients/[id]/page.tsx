import { Activity, BedDouble, Flame, HeartPulse, Waves, Wind, Zap } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { deletePatient } from "@/actions/patients";
import { AlertList } from "@/components/alert-list";
import { AutoRefresh } from "@/components/auto-refresh";
import { DailyBars, TrendChart } from "@/components/charts";
import { ConfirmButton } from "@/components/confirm-button";
import { GeofenceManager } from "@/components/geofence-manager";
import { ThresholdForm } from "@/components/threshold-form";
import { DateTime, RelativeTime } from "@/components/time";
import { Badge, Card, CardHeader, SyntheticBadge } from "@/components/ui";
import { WearablePanel } from "@/components/wearable-panel";
import { logAudit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { formatValue, READING_META } from "@/lib/format";
import { getCollections } from "@/lib/mongodb";
import { getPatientDetail } from "@/lib/queries";
import type { ReadingType } from "@/lib/types";

const VITALS: { type: ReadingType; icon: typeof Activity; color: string }[] = [
  { type: "heart_rate", icon: HeartPulse, color: "text-rose-500" },
  { type: "resting_heart_rate", icon: HeartPulse, color: "text-pink-500" },
  { type: "hrv", icon: Waves, color: "text-violet-500" },
  { type: "spo2", icon: Wind, color: "text-sky-500" },
  { type: "steps", icon: Activity, color: "text-brand-600" },
  { type: "active_energy", icon: Flame, color: "text-orange-500" },
  { type: "sleep_hours", icon: BedDouble, color: "text-indigo-500" },
  { type: "respiratory_rate", icon: Zap, color: "text-amber-500" },
];

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

export default async function PatientPage(props: PageProps<"/patients/[id]">) {
  const { id } = await props.params;
  const staff = await requireStaff();
  const detail = await getPatientDetail(id);
  if (!detail) notFound();
  const { row, profile, latest, series, locations, geofences, alerts, thresholds, rules, overrides } = detail;

  await logAudit(await getCollections(), staff, "patient.viewed", "patient", id, row.mrn);

  const paired = row.wearableStatus === "active" || row.wearableStatus === "pending";
  const isSE = /\bSE\b/i.test(row.deviceLabel ?? "");
  const progress = Math.min(100, Math.round((row.programDay / row.programLengthDays) * 100));
  const openAlerts = alerts.filter((a) => a.status !== "resolved");
  const trail = locations.map((l) => [l.lat, l.lng] as [number, number]);

  return (
    <>
      <Link href="/patients" className="text-sm text-slate-500 hover:text-slate-700">
        ← Patients
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-700">
            {row.firstName[0]}
            {row.lastName[0]}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{row.name}</h1>
              {row.isSynthetic && <SyntheticBadge />}
              {openAlerts.length > 0 && <Badge tone="rose">{openAlerts.length} open alert{openAlerts.length > 1 ? "s" : ""}</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {row.mrn} · {row.age} yrs{row.gender ? ` · ${row.gender}` : ""} · {row.program}
              {row.clinician ? ` · ${row.clinician}` : ""}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-slate-500">
                Day {row.programDay} of {row.programLengthDays}
              </span>
            </div>
          </div>
        </div>
        <AutoRefresh />
      </div>

      {paired ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {VITALS.map(({ type, icon: Icon, color }) => {
            const v = latest[type];
            const meta = READING_META[type];
            const unsupported = type === "spo2" && isSE && !v;
            if (!v && (type === "respiratory_rate" || type === "active_energy")) return null;
            return (
              <Card key={type} className="p-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Icon className={`size-3.5 ${color}`} />
                  {meta.label}
                </div>
                {v ? (
                  <>
                    <div className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
                      {formatValue(type, v.value)} <span className="text-sm font-normal text-slate-400">{meta.unit}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      <RelativeTime iso={v.at} />
                    </div>
                  </>
                ) : (
                  <div className="mt-1.5 text-sm text-slate-400">{unsupported ? "Not supported on Apple Watch SE" : "No data yet"}</div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed p-5 text-sm text-slate-600">
          No wearable is paired for {row.firstName}. Intake information is shown below. Use <strong>Activate wearable</strong> to start biometric and location monitoring.
        </Card>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {paired && (
            <>
              <Card>
                <CardHeader title="Heart rate" subtitle={`Alert thresholds: below ${thresholds.hrLow} or above ${thresholds.hrHigh} bpm`} />
                <div className="p-4">
                  <TrendChart
                    points={series.heart_rate ?? []}
                    unit="bpm"
                    color="#e11d48"
                    thresholds={[
                      { value: thresholds.hrHigh, label: `High ${thresholds.hrHigh}` },
                      { value: thresholds.hrLow, label: `Low ${thresholds.hrLow}` },
                    ]}
                  />
                </div>
              </Card>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader title="Heart rate variability" subtitle="SDNN, ms" />
                  <div className="p-4">
                    <TrendChart points={series.hrv ?? []} unit="ms" color="#7c3aed" height={180} defaultRange="7d" />
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Blood oxygen" subtitle={isSE ? "Apple Watch SE has no SpO₂ sensor" : `Alert below ${thresholds.spo2Low}%`} />
                  <div className="p-4">
                    <TrendChart points={series.spo2 ?? []} unit="%" color="#0284c7" height={180} defaultRange="7d" thresholds={[{ value: thresholds.spo2Low, label: `Low ${thresholds.spo2Low}` }]} />
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Daily steps" subtitle="Last 7 days" />
                  <div className="p-4">
                    <DailyBars points={series.steps ?? []} unit="steps" />
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Sleep" subtitle="Hours per night" />
                  <div className="p-4">
                    <DailyBars points={series.sleep_hours ?? []} unit="h" color="#6366f1" />
                  </div>
                </Card>
              </div>
            </>
          )}

          {paired && (
            <Card>
              <CardHeader title="Location" subtitle="Latest position, 48-hour trail and geofences" />
              <GeofenceManager patientId={row.id} patientName={row.name} lastLocation={locations[0] ?? undefined} trail={trail} fences={geofences} />
            </Card>
          )}

          <Card>
            <CardHeader title="Alert history" subtitle={`${alerts.length} most recent`} />
            <AlertList alerts={alerts} showPatient={false} withNotes emptyText="No alerts for this patient" />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Wearable" subtitle="Apple Watch via iPhone HealthKit" />
            <WearablePanel
              patientId={row.id}
              firstName={row.firstName}
              status={row.wearableStatus}
              online={row.online}
              deviceLabel={row.deviceLabel}
              lastSyncAt={row.lastSyncAt}
              activatedAt={profile.activatedAt}
              keyHint={profile.keyHint}
              source={profile.source}
              consentGiven={profile.consentGiven}
            />
          </Card>

          <Card>
            <CardHeader title="Patient information" />
            <dl className="divide-y divide-slate-100 px-5 py-2">
              <InfoRow label="Date of birth">
                <DateTime iso={profile.dateOfBirth} pattern="MMM d, yyyy" /> ({row.age})
              </InfoRow>
              <InfoRow label="Admitted">
                <DateTime iso={row.admissionDate} pattern="MMM d, yyyy" />
              </InfoRow>
              <InfoRow label="Program">{row.program}</InfoRow>
              {profile.primaryConcern && <InfoRow label="Primary concern">{profile.primaryConcern}</InfoRow>}
              <InfoRow label="Clinician">{row.clinician ?? "—"}</InfoRow>
              <InfoRow label="Phone">{profile.phone ?? "—"}</InfoRow>
              <InfoRow label="Emergency contact">
                {profile.emergencyContact ? (
                  <>
                    {profile.emergencyContact.name}
                    {profile.emergencyContact.relation && <span className="font-normal text-slate-500"> ({profile.emergencyContact.relation})</span>}
                    <div className="font-normal text-slate-500">{profile.emergencyContact.phone}</div>
                  </>
                ) : (
                  "—"
                )}
              </InfoRow>
              <InfoRow label="Monitoring consent">
                {profile.consentGiven ? (
                  <Badge tone="green">
                    Given {profile.consentDate && <DateTime iso={profile.consentDate} pattern="MMM d" />}
                  </Badge>
                ) : (
                  <Badge tone="amber">Not recorded</Badge>
                )}
              </InfoRow>
              <InfoRow label="Enrolled">
                <DateTime iso={profile.createdAt} pattern="MMM d, yyyy" />
              </InfoRow>
            </dl>
            {profile.notes && <p className="mx-5 mb-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{profile.notes}</p>}
          </Card>

          <Card>
            <CardHeader title="Alert thresholds" subtitle="Per-patient overrides" />
            <ThresholdForm patientId={row.id} overrides={overrides} rules={rules} />
          </Card>

          {staff.role === "admin" && (
            <form action={deletePatient} className="text-right">
              <input type="hidden" name="patientId" value={row.id} />
              <ConfirmButton message={`Remove ${row.name} and all biometric, location and alert data? This cannot be undone.`} className="btn-danger btn-sm">
                Remove patient and all data
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
