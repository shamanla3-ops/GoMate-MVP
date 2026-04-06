/**
 * Compare trip departure instants using ISO-8601 strings from the API.
 * `Date.parse` interprets Z/offset correctly (UTC-safe).
 */
export function parseDepartureInstantMs(iso: string | null | undefined): number | null {
  if (!iso || typeof iso !== "string") return null;
  const ms = Date.parse(iso.trim());
  return Number.isFinite(ms) ? ms : null;
}

/** True when departure is strictly before `nowMs` (default: current instant). */
export function isDepartureStrictlyPast(
  iso: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  const ms = parseDepartureInstantMs(iso);
  if (ms === null) return false;
  return ms < nowMs;
}
