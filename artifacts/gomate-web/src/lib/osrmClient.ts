/**
 * Client-side driving duration (minutes) via public OSRM.
 * Optional hint for trip creation; server still validates against its own routing.
 */

const OSRM_ROUTE = "https://router.project-osrm.org/route/v1/driving";

export async function fetchDrivingDurationMinutes(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  signal?: AbortSignal
): Promise<number> {
  const url = `${OSRM_ROUTE}/${originLng},${originLat};${destLng},${destLat}?overview=false`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`OSRM HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    code?: string;
    routes?: { duration?: number }[];
  };
  if (data.code !== "Ok") {
    throw new Error(`OSRM: ${data.code ?? "no route"}`);
  }
  const seconds = data.routes?.[0]?.duration;
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("OSRM: invalid duration");
  }
  return Math.max(1, Math.ceil(seconds / 60));
}
