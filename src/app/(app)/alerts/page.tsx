import clsx from "clsx";
import Link from "next/link";
import { AlertList } from "@/components/alert-list";
import { AutoRefresh } from "@/components/auto-refresh";
import { Card, PageHeader } from "@/components/ui";
import { runConnectivityCheck } from "@/lib/alerts";
import { getCollections } from "@/lib/mongodb";
import { listAlerts } from "@/lib/queries";
import type { AlertStatus } from "@/lib/types";

const TABS: { key: AlertStatus | "open" | "all"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "active", label: "Active" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

export default async function AlertsPage(props: PageProps<"/alerts">) {
  const { status } = await props.searchParams;
  const current = (TABS.find((t) => t.key === status)?.key ?? "open") as (typeof TABS)[number]["key"];
  await runConnectivityCheck(await getCollections()).catch(() => 0);
  const { alerts, counts } = await listAlerts(current === "all" ? undefined : current);
  const countFor = (key: (typeof TABS)[number]["key"]) =>
    key === "all"
      ? Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)
      : key === "open"
        ? (counts.active ?? 0) + (counts.acknowledged ?? 0)
        : (counts[key] ?? 0);

  return (
    <>
      <PageHeader title="Alerts" subtitle="Rule-based alerts prompt staff review. They do not diagnose relapse or medical emergencies." action={<AutoRefresh />} />
      <Card>
        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-4 py-3">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/alerts?status=${t.key}`}
              className={clsx("rounded-lg px-3 py-1.5 text-xs font-medium", current === t.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              {t.label} <span className="opacity-60">{countFor(t.key)}</span>
            </Link>
          ))}
        </div>
        <AlertList alerts={alerts} withNotes emptyText={current === "open" ? "No open alerts. All clear." : "No alerts here"} />
      </Card>
    </>
  );
}
