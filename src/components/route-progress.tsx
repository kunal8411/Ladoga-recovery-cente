"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PendingPathContext } from "@/components/pending-path";
import { Sidebar } from "@/components/sidebar";

function loadingLabel(path: string) {
  if (/^\/patients\/(?!new$)[^/]+/.test(path)) return "Loading patient";
  if (path.startsWith("/patients")) return "Loading patients";
  if (path.startsWith("/dashboard")) return "Loading dashboard";
  if (path.startsWith("/alerts")) return "Loading alerts";
  if (path.startsWith("/settings")) return "Loading alert rules";
  if (path.startsWith("/audit")) return "Loading audit log";
  if (path.startsWith("/device-setup")) return "Loading device setup";
  return "Loading";
}

export function RouteProgress({
  staffName,
  role,
  activeAlerts,
  children,
}: {
  staffName: string;
  role: string;
  activeAlerts: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      const nextPath = new URL(href, window.location.origin).pathname;
      if (nextPath === pathname) return;
      setPendingPath(nextPath);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  return (
    <PendingPathContext.Provider value={pendingPath}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar staffName={staffName} role={role} activeAlerts={activeAlerts} />
        <main className="relative min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
          {pendingPath && <div className="route-progress" aria-hidden="true" />}
          <div className="relative mx-auto min-h-[70vh] max-w-7xl">
            {children}
            {pendingPath && (
              <div className="absolute inset-0 z-30 flex items-start justify-center bg-[#f6f8fb]/75 pt-28" role="status" aria-live="polite">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <span className="size-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
                  <span className="text-sm font-medium text-slate-700">{loadingLabel(pendingPath)}</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </PendingPathContext.Provider>
  );
}
