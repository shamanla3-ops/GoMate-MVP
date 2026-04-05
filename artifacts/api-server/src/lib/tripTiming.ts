import { db, trips, eq } from "@gomate/db";
import {
  resolveDrivingDurationMinutes,
  estimateDurationMinutesFromCoords,
} from "./osrmDuration.js";

export type TripRow = typeof trips.$inferSelect;

/** Time after `expected_end_time` before a scheduled trip is auto-completed */
export const COMPLETION_BUFFER_MS = 60 * 60 * 1000;

function hasRouteCoords(trip: TripRow): boolean {
  return (
    trip.originLat != null &&
    trip.originLng != null &&
    trip.destinationLat != null &&
    trip.destinationLng != null &&
    Number.isFinite(trip.originLat) &&
    Number.isFinite(trip.originLng) &&
    Number.isFinite(trip.destinationLat) &&
    Number.isFinite(trip.destinationLng)
  );
}

/**
 * Duration fallback when OSRM fails but coordinates exist (not a flat "60 minutes").
 */
export function durationMinutesFromCoordsFallback(trip: TripRow): number | null {
  if (!hasRouteCoords(trip)) return null;
  return estimateDurationMinutesFromCoords(
    trip.originLat!,
    trip.originLng!,
    trip.destinationLat!,
    trip.destinationLng!
  );
}

/**
 * True if timing likely came from migration 0011 (departure + 1h, duration 60)
 * and should be recomputed from the real route.
 */
export function looksLikeLegacyPlaceholderTiming(trip: TripRow): boolean {
  if (!trip.expectedEndTime || trip.estimatedDurationMinutes == null) {
    return false;
  }
  if (trip.estimatedDurationMinutes !== 60) return false;
  const dep = new Date(trip.departureTime).getTime();
  const end = new Date(trip.expectedEndTime).getTime();
  const delta = end - dep;
  // Within 2 minutes of exactly 60 minutes
  return Math.abs(delta - 60 * 60 * 1000) < 2 * 60 * 1000;
}

export function expectedEndMs(trip: TripRow): number | null {
  if (trip.expectedEndTime) {
    return new Date(trip.expectedEndTime).getTime();
  }
  const dep = new Date(trip.departureTime).getTime();
  const mins =
    trip.estimatedDurationMinutes ??
    durationMinutesFromCoordsFallback(trip) ??
    null;
  if (mins == null || !Number.isFinite(mins) || mins < 1) {
    return null;
  }
  return dep + mins * 60 * 1000;
}

export function shouldAutoCompleteScheduledTrip(trip: TripRow): boolean {
  if (trip.status !== "scheduled") return false;
  const endMs = expectedEndMs(trip);
  if (endMs == null) return false;
  return Date.now() >= endMs + COMPLETION_BUFFER_MS;
}

/**
 * Recompute and persist `estimated_duration_minutes` + `expected_end_time` for scheduled trips
 * when values are missing or match the old migration placeholder.
 */
export async function repairScheduledTripTiming(trip: TripRow): Promise<TripRow> {
  if (trip.status !== "scheduled" || !hasRouteCoords(trip)) {
    return trip;
  }

  const needsRepair =
    trip.estimatedDurationMinutes == null ||
    trip.expectedEndTime == null ||
    looksLikeLegacyPlaceholderTiming(trip);

  if (!needsRepair) {
    return trip;
  }

  const dep = new Date(trip.departureTime);
  const durationMinutes = await resolveDrivingDurationMinutes(
    trip.originLat!,
    trip.originLng!,
    trip.destinationLat!,
    trip.destinationLng!
  );
  const expectedEndTime = new Date(
    dep.getTime() + durationMinutes * 60 * 1000
  );

  await db
    .update(trips)
    .set({
      estimatedDurationMinutes: durationMinutes,
      expectedEndTime,
    })
    .where(eq(trips.id, trip.id));

  const updated = await db.query.trips.findFirst({
    where: eq(trips.id, trip.id),
  });

  return updated ?? {
    ...trip,
    estimatedDurationMinutes: durationMinutes,
    expectedEndTime,
  };
}
