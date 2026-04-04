/**
 * Driving route geometry via public OSRM (OpenStreetMap data).
 * Falls back to a straight segment if the request fails (network/CORS).
 */

const OSRM_ROUTE = "https://router.project-osrm.org/route/v1/driving";

export async function fetchDrivingRouteLatLngs(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  signal?: AbortSignal
): Promise<[number, number][]> {
  const url = `${OSRM_ROUTE}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`OSRM HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    routes?: { geometry?: { coordinates?: [number, number][] } }[];
  };
  const coords = data.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    throw new Error("OSRM: empty route");
  }
  return coords.map(([lng, lat]) => [lat, lng] as [number, number]);
}

export function straightLineFallback(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): [number, number][] {
  return [
    [originLat, originLng],
    [destLat, destLng],
  ];
}
