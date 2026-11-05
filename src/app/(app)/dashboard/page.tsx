import { Activity, Bell, HeartPulse, MapPinOff, Users, WifiOff, Watch } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertList } from "@/components/alert-list";
import { AutoRefresh } from "@/components/auto-refresh";
import { PatientMap, type MapMarker } from "@/components/map";
import { RelativeTime } from "@/components/time";
import { Card, CardHeader, EmptyState, PageHeader, SyntheticBadge, WearableBadge } from "@/components/ui";
import { runConnectivityCheck } from "@/lib/alerts";
import { requireStaff } from "@/lib/auth";
import { getCollections } from "@/lib/mongodb";
import { getDashboardData } from "@/lib/queries";

function Kpi({ icon, label, value, hint, tone = "slate", href }: { icon: ReactNode; label: string; value: ReactNode; hint?: ReactNode; tone?: "slate" | "teal" | "rose" | "amber" | "sky"; href?: string }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    teal: "bg-brand-50 text-brand-700",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
  };
  const body = (
    <Card className="h-full p-4 transition hover:border-slate-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`flex size-7 items-center justify-center rounded-md ${tones[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function DashboardPage() {
  const staff = await requireStaff();
  await runConnectivityCheck(await getCollections()).catch(() => 0);
  const { rows, stats, recentAlerts } = await getDashboardData();

  const monitored = rows.filter((r) => r.wearableStatus === "active" || r.wearableStatus === "pending");
  const markers: MapMarker[] = rows
    .filter((r) => r.lastLocation)
    .map((r) => ({
      id: r.id,
      lat: r.lastLocation!.lat,
      lng: r.lastLocation!.lng,
      label: r.name,
      sublabel: `${r.mrn} · ${r.outsideSafeZone ? "Outside safe zone" : "Location updated"}`,
      href: `/patients/${r.id}`,
      tone: r.outsideSafeZone ? "rose" : r.online ? "teal" : "amber",
    }));

  return (
    <>
      <PageHeader title={`Welcome back, ${staff.name.split(" ")[0]}`} subtitle="Overview of enrolled patients, connected wearables and open alerts." action={<AutoRefresh />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={<Users className="size-4" />} label="Total patients" value={stats.totalPatients} hint={`Avg. program day ${stats.avgProgramDay}`} href="/patients" />
        <Kpi icon={<Watch className="size-4" />} label="Active wearables" value={stats.activeWearables} tone="teal" hint={stats.pendingWearables ? `${stats.pendingWearables} awaiting first sync` : `${stats.onlineDevices} live now`} href="/patients?filter=monitored" />
        <Kpi icon={<Bell className="size-4" />} label="Active alerts" value={stats.activeAlerts} tone={stats.activeAlerts ? "rose" : "slate"} hint={`${stats.acknowledgedAlerts} acknowledged · ${stats.alertsToday} in 24h`} href="/alerts" />
        <Kpi icon={<WifiOff className="size-4" />} label="Devices offline" value={stats.offlineDevices} tone={stats.offlineDevices ? "amber" : "slate"} hint="No recent sync" />
        <Kpi icon={<MapPinOff className="size-4" />} label="Outside safe zone" value={stats.outsideSafeZone} tone={stats.outsideSafeZone ? "rose" : "slate"} hint="Based on last location" />
        <Kpi icon={<HeartPulse className="size-4" />} label="Avg heart rate" value={stats.avgHeartRate ? `${stats.avgHeartRate}` : "—"} tone="sky" hint={stats.avgHeartRate ? "bpm · last 6h readings" : "No recent readings"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Live monitoring" subtitle="Patients with a paired Apple Watch" action={<Link href="/patients" className="text-xs font-medium text-brand-700 hover:underline">All patients →</Link>} />
          {monitored.length === 0 ? (
            <EmptyState title="No wearables paired yet">
              Open a patient and choose <strong>Activate wearable</strong> to issue a device key.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {monitored.map((p) => (
                <li key={p.id}>
                  <Link href={`/patients/${p.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-slate-50">
                    <div className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                      {p.firstName[0]}
                      {p.lastName[0]}
                    </div>
                    <div className="min-w-40 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        {p.name} {p.isSynthetic && <SyntheticBadge />}
                      </div>
                      <div className="text-xs text-slate-500">
                        {p.mrn} · Day {p.programDay} of {p.programLengthDays} · {p.deviceLabel ?? "Apple Watch"}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-lg font-semibold text-slate-900">
                        <HeartPulse className="size-4 text-rose-500" />
                        {p.heartRate ? Math.round(p.heartRate.value) : "—"}
                      </div>
                      <div className="text-[11px] text-slate-400">bpm</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-lg font-semibold text-slate-900">
                        <Activity className="size-4 text-brand-600" />
                        {p.steps !== undefined ? Math.round(p.steps).toLocaleString() : "—"}
                      </div>
                      <div className="text-[11px] text-slate-400">steps</div>
                    </div>
                    <div className="w-28 text-right">
                      <WearableBadge status={p.wearableStatus} online={p.online} />
                      <div className="mt-1 text-[11px] text-slate-400">
                        <RelativeTime iso={p.lastSyncAt} fallback="Never synced" />
                      </div>
                    </div>
                    {p.openAlerts > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">{p.openAlerts}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Open alerts" subtitle="Most recent first" action={<Link href="/alerts" className="text-xs font-medium text-brand-700 hover:underline">View all →</Link>} />
          <AlertList alerts={recentAlerts} emptyText="No open alerts" />
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Patient locations" subtitle="Latest known location of each monitored patient" />
        <div className="p-3">
          {markers.length === 0 ? (
            <EmptyState title="No locations yet">Locations appear after a paired iPhone sends its first update.</EmptyState>
          ) : (
            <PatientMap markers={markers} height={380} />
          )}
        </div>
      </Card>
    </>
  );
}
