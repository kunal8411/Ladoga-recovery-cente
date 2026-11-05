"use client";

import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import clsx from "clsx";
import { useNow } from "./time";

interface Point {
  t: number;
  v: number;
}

const RANGES = { "24h": 24 * 3600_000, "7d": 7 * 24 * 3600_000 } as const;

export function TrendChart({
  points,
  unit,
  color = "#0d9488",
  thresholds = [],
  height = 220,
  defaultRange = "24h",
}: {
  points: Point[];
  unit: string;
  color?: string;
  thresholds?: { value: number; label: string }[];
  height?: number;
  defaultRange?: keyof typeof RANGES;
}) {
  const [range, setRange] = useState<keyof typeof RANGES>(defaultRange);
  const gradientId = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;
  const now = useNow();
  const data = useMemo(() => {
    if (now === null) return points;
    const since = now - RANGES[range];
    return points.filter((p) => p.t >= since);
  }, [points, range, now]);

  return (
    <div>
      <div className="mb-2 flex justify-end gap-1">
        {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={clsx("rounded-md px-2 py-0.5 text-xs font-medium", range === r ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
          >
            {r}
          </button>
        ))}
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400" style={{ height }}>
          No data in the last {range}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#eef2f6" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) => format(t, range === "24h" ? "h a" : "EEE")}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
            <Tooltip
              labelFormatter={(t) => format(Number(t), "MMM d, h:mm a")}
              formatter={(v) => [`${Math.round(Number(v) * 10) / 10} ${unit}`, ""]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
            />
            {thresholds.map((th) => (
              <ReferenceLine key={th.label} y={th.value} stroke="#e11d48" strokeDasharray="4 4" label={{ value: th.label, fontSize: 10, fill: "#e11d48", position: "insideTopRight" }} />
            ))}
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={data.length < 30} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** Groups cumulative or nightly readings into one bar per local day (max value per day). */
export function DailyBars({ points, unit, color = "#0d9488", height = 180 }: { points: Point[]; unit: string; color?: string; height?: number }) {
  const data = useMemo(() => {
    const byDay = new Map<string, { day: string; v: number; t: number }>();
    for (const p of points) {
      const key = format(p.t, "yyyy-MM-dd");
      const cur = byDay.get(key);
      if (!cur || p.v > cur.v) byDay.set(key, { day: format(p.t, "EEE d"), v: p.v, t: p.t });
    }
    return [...byDay.values()].sort((a, b) => a.t - b.t).slice(-7);
  }, [points]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400" style={{ height }}>
        No data in the last 7 days
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v) => [`${Math.round(Number(v) * 10) / 10} ${unit}`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
        <Bar dataKey="v" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
