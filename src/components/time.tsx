"use client";

import { format, formatDistanceToNowStrict } from "date-fns";
import { useSyncExternalStore } from "react";

const TICK_MS = 15_000;

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, TICK_MS);
  return () => clearInterval(id);
}

/** Current time rounded to the tick, or null during server render so output is hydration-safe. */
export function useNow() {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / TICK_MS) * TICK_MS,
    () => null,
  );
}

export function RelativeTime({ iso, fallback = "—" }: { iso?: string; fallback?: string }) {
  const now = useNow();
  if (!iso) return <span className="text-slate-400">{fallback}</span>;
  const date = new Date(iso);
  if (now === null) return <span title={iso}>&nbsp;</span>;
  const label = now - date.getTime() < 45_000 ? "just now" : `${formatDistanceToNowStrict(date)} ago`;
  return <time dateTime={iso} title={format(date, "PPpp")}>{label}</time>;
}

export function DateTime({ iso, pattern = "MMM d, yyyy h:mm a", fallback = "—" }: { iso?: string; pattern?: string; fallback?: string }) {
  const now = useNow();
  if (!iso) return <span className="text-slate-400">{fallback}</span>;
  if (now === null) return <span>&nbsp;</span>;
  return <time dateTime={iso}>{format(new Date(iso), pattern)}</time>;
}
