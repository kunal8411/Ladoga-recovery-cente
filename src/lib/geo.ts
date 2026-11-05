const EARTH_RADIUS_M = 6_371_000;

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function isInside(
  point: { lat: number; lng: number },
  fence: { lat: number; lng: number; radiusMeters: number },
) {
  return distanceMeters(point, fence) <= fence.radiusMeters;
}
