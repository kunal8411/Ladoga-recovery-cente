import { DateTime } from "@/components/time";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { listAuditLogs } from "@/lib/queries";

export default async function AuditPage() {
  const logs = await listAuditLogs();
  return (
    <>
      <PageHeader title="Audit log" subtitle="Who accessed or changed patient data, and when. Latest 200 events." />
      <Card className="overflow-hidden">
        {logs.length === 0 ? (
          <EmptyState title="No events yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="th">Time</th>
                  <th className="th">Actor</th>
                  <th className="th">Action</th>
                  <th className="th">Target</th>
                  <th className="th">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="td whitespace-nowrap text-xs text-slate-500">
                      <DateTime iso={l.at} pattern="MMM d, h:mm:ss a" />
                    </td>
                    <td className="td">{l.actorName}</td>
                    <td className="td">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{l.action}</code>
                    </td>
                    <td className="td text-xs text-slate-500">
                      {l.targetType}
                      {l.targetId && <span className="font-mono"> · {l.targetId.slice(-6)}</span>}
                    </td>
                    <td className="td max-w-xs truncate text-xs text-slate-500" title={l.details}>
                      {l.details ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
