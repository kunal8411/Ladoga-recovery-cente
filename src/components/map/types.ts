export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  href?: string;
  tone?: "teal" | "rose" | "amber" | "slate";
}

export interface MapFence {
  id: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  kind: "safe" | "restricted";
  name: string;
}

export interface MapProps {
  markers: MapMarker[];
  fences?: MapFence[];
  trail?: [number, number][];
  height?: number;
  onPick?: (lat: number, lng: number) => void;
  draft?: { lat: number; lng: number; radiusMeters: number; kind: "safe" | "restricted" } | null;
}
