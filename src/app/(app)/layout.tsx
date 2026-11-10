import type { ReactNode } from "react";
import { RouteProgress } from "@/components/route-progress";
import { requireStaff } from "@/lib/auth";
import { getCollections, isDatabaseConfigured } from "@/lib/mongodb";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaff();

  if (!isDatabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-lg p-8">
          <h1 className="text-lg font-semibold">Connect MongoDB to continue</h1>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as <strong>{staff.name}</strong>. The dashboard needs a database. Add these to <code className="rounded bg-slate-100 px-1">.env.local</code>{" "}
            (or Netlify environment variables) and restart:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
            {`MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/\nMONGODB_DB=recovery_shield`}
          </pre>
        </div>
      </div>
    );
  }

  let activeAlerts = 0;
  let dbError: string | null = null;
  try {
    const cols = await getCollections();
    activeAlerts = await cols.alerts.countDocuments({ status: "active" });
  } catch (err) {
    dbError = (err as Error).message;
  }

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-xl border-rose-200 p-6">
          <h1 className="font-semibold text-rose-700">Can&apos;t reach the database</h1>
          <p className="mt-2 text-sm text-slate-600">{dbError}</p>
          <p className="mt-2 text-sm text-slate-500">
            Check MONGODB_URI and that your Atlas Network Access list allows this server (for Netlify, allow 0.0.0.0/0 for the prototype).
          </p>
        </div>
      </div>
    );
  }

  return (
    <RouteProgress staffName={staff.name} role={staff.role} activeAlerts={activeAlerts}>
      {children}
    </RouteProgress>
  );
}
