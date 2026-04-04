/**
 * Driving route duration via public OSRM. Falls back to haversine + average speed.
 */

const OSRM_ROUTE = "https://router.project-osrm.org/route/v1/driving";

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in km */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Conservative road estimate when routing fails (50 km/h average). */
export function estimateDurationMinutesFromCoords(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): number {
  const km = haversineKm(originLat, originLng, destLat, destLng);
  const hours = km / 50;
  const minutes = Math.ceil(hours * 60);
  return Math.max(15, Math.min(24 * 60, minutes));
}

/**
 * Returns driving duration in seconds from OSRM, or throws.
 */
export async function fetchDrivingDurationSeconds(
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
  const duration = data.routes?.[0]?.duration;
  if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
    throw new Error("OSRM: invalid duration");
  }
  return duration;
}

export async function resolveDrivingDurationMinutes(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<number> {
  try {
    const seconds = await fetchDrivingDurationSeconds(
      originLat,
      originLng,
      destLat,
      destLng
    );
    return Math.max(1, Math.ceil(seconds / 60));
  } catch {
    return estimateDurationMinutesFromCoords(
      originLat,
      originLng,
      destLat,
      destLng
    );
  }
}
