"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { MapProps } from "./types";

const MARKER_COLORS = { teal: "#0d9488", rose: "#e11d48", amber: "#d97706", slate: "#64748b" };
const FENCE_COLORS = { safe: "#059669", restricted: "#e11d48" };

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    }
    // Refit only when the set of points changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function MapInner({ markers, fences = [], trail = [], height = 360, onPick, draft }: MapProps) {
  const points: [number, number][] = [
    ...markers.map((m) => [m.lat, m.lng] as [number, number]),
    ...fences.map((f) => [f.lat, f.lng] as [number, number]),
  ];
  const fallbackCenter: [number, number] = points[0] ?? [39.5, -98.35];

  return (
    <div style={{ height }} className="overflow-hidden rounded-lg">
      <MapContainer center={fallbackCenter} zoom={points.length ? 14 : 4} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <FitBounds points={points} />
        {onPick && <ClickHandler onPick={onPick} />}

        {fences.map((f) => (
          <Circle
            key={f.id}
            center={[f.lat, f.lng]}
            radius={f.radiusMeters}
            pathOptions={{ color: FENCE_COLORS[f.kind], fillColor: FENCE_COLORS[f.kind], fillOpacity: 0.1, weight: 2, dashArray: f.kind === "restricted" ? "6 6" : undefined }}
          >
            <Tooltip>
              {f.kind === "safe" ? "Safe zone" : "Restricted"}: {f.name} ({f.radiusMeters} m)
            </Tooltip>
          </Circle>
        ))}

        {draft && (
          <Circle
            center={[draft.lat, draft.lng]}
            radius={draft.radiusMeters}
            pathOptions={{ color: FENCE_COLORS[draft.kind], fillOpacity: 0.15, weight: 2, dashArray: "4 4" }}
          />
        )}

        {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: "#0d9488", weight: 2, opacity: 0.5 }} />}
        {trail.slice(1).map((p, i) => (
          <CircleMarker key={i} center={p} radius={2.5} pathOptions={{ color: "#0d9488", weight: 0, fillOpacity: 0.35 }} />
        ))}

        {markers.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={9}
            pathOptions={{ color: "#fff", weight: 2.5, fillColor: MARKER_COLORS[m.tone ?? "teal"], fillOpacity: 1 }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{m.label}</div>
                {m.sublabel && <div className="text-slate-500">{m.sublabel}</div>}
                {m.href && (
                  <a href={m.href} className="mt-1 inline-block text-teal-700">
                    Open patient →
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
