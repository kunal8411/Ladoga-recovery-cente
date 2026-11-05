"use client";

import dynamic from "next/dynamic";
import type { MapProps } from "./types";

export type { MapFence, MapMarker } from "./types";

const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => <div className="h-full min-h-60 animate-pulse rounded-lg bg-slate-100" />,
});

export function PatientMap(props: MapProps) {
  return <MapInner {...props} />;
}
