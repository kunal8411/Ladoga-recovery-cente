"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import clsx from "clsx";

export function AutoRefresh({ intervalSeconds = 30 }: { intervalSeconds?: number }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [pending, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      startTransition(() => router.refresh());
      setLastRefresh(new Date());
    }, intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [enabled, intervalSeconds, router]);

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <button
        type="button"
        onClick={() => {
          startTransition(() => router.refresh());
          setLastRefresh(new Date());
        }}
        className="btn-secondary btn-sm"
        title="Refresh now"
      >
        <RefreshCw className={clsx("size-3.5", pending && "animate-spin")} />
        Refresh
      </button>
      <label className="flex cursor-pointer items-center gap-1.5 select-none">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-brand-600" />
        Live ({intervalSeconds}s)
      </label>
      {lastRefresh && <span className="hidden sm:inline">· Updated {lastRefresh.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>}
    </div>
  );
}
