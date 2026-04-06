/**
 * GoMate eco impact (MVP)
 *
 * Model: for a completed carpool, each accepted passenger avoided a solo car trip of the same
 * route distance. Total CO₂ avoided for the trip ≈ distance × emission factor × passenger count.
 *
 * Attribution: we split the total equally among the driver + each accepted passenger so:
 * - summed per-user records match the trip total (no double counting across users)
 * - everyone who made the ride possible gets visible credit
 *
 * Emission factor: conservative average for a typical passenger car (~120 g CO₂/km).
 * Distance: trip.distance_km if set; else haversine between origin/destination coordinates.
 */

import {
  and,
  eq,
  sql,
  sum,
  trips,
  tripRequests,
  users,
  ecoImpactRecords,
  userBadges,
} from "@gomate/db";
import { haversineKm } from "./osrmDuration.js";

/** kg CO₂ per km (average passenger car, tailpipe; MVP — document-only, not a regulatory claim) */
export const EMISSION_FACTOR_KG_CO2_PER_KM = 0.12;

export const ECO_BADGE_THRESHOLDS_KG: { code: string; thresholdKg: number }[] = [
  { code: "eco_10", thresholdKg: 10 },
  { code: "eco_50", thresholdKg: 50 },
  { code: "eco_100", thresholdKg: 100 },
  { code: "eco_250", thresholdKg: 250 },
  { code: "eco_500", thresholdKg: 500 },
  { code: "eco_1000", thresholdKg: 1000 },
];

export function computeDistanceKmFromTrip(
  trip: typeof trips.$inferSelect
): number | null {
  if (
    trip.distanceKm != null &&
    Number.isFinite(trip.distanceKm) &&
    trip.distanceKm > 0
  ) {
    return trip.distanceKm;
  }
  if (
    trip.originLat != null &&
    trip.originLng != null &&
    trip.destinationLat != null &&
    trip.destinationLng != null
  ) {
    const km = haversineKm(
      trip.originLat,
      trip.originLng,
      trip.destinationLat,
      trip.destinationLng
    );
    return km > 0 ? km : null;
  }
  return null;
}

export function computeTripTotalCo2Kg(distanceKm: number, passengerCount: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  if (!Number.isFinite(passengerCount) || passengerCount < 1) return 0;
  return distanceKm * EMISSION_FACTOR_KG_CO2_PER_KM * passengerCount;
}

function dedupePassengerIds(rows: { passengerId: string }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    if (seen.has(r.passengerId)) continue;
    seen.add(r.passengerId);
    out.push(r.passengerId);
  }
  return out;
}

/** Transaction handle from `db.transaction` — keep loose to avoid coupling to Drizzle generics */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbTx = any;

/**
 * Idempotent: if trip.ecoAwardedAt is set, no-op. Unique (trip_id, user_id) prevents duplicates.
 */
export async function awardEcoImpactForCompletedTrip(
  tx: DbTx,
  tripId: string,
  completedAt: Date
): Promise<{ awarded: boolean; reason?: string }> {
  const trip = await tx.query.trips.findFirst({
    where: eq(trips.id, tripId),
  });

  if (!trip) return { awarded: false, reason: "trip_not_found" };
  if (trip.status !== "completed") return { awarded: false, reason: "not_completed" };
  if (trip.ecoAwardedAt) return { awarded: false, reason: "already_awarded" };

  const acceptedRaw = await tx.query.tripRequests.findMany({
    where: and(eq(tripRequests.tripId, tripId), eq(tripRequests.status, "accepted")),
  });

  const passengerIds = dedupePassengerIds(acceptedRaw).filter(
    (pid) => pid !== trip.driverId
  );

  if (passengerIds.length === 0) {
    await tx
      .update(trips)
      .set({
        ecoAwardedAt: completedAt,
        ecoTotalCo2Kg: 0,
      })
      .where(eq(trips.id, tripId));
    return { awarded: true, reason: "no_passengers" };
  }

  const distanceKm = computeDistanceKmFromTrip(trip);
  if (distanceKm == null || distanceKm <= 0) {
    await tx
      .update(trips)
      .set({
        ecoAwardedAt: completedAt,
        ecoTotalCo2Kg: 0,
      })
      .where(eq(trips.id, tripId));
    return { awarded: true, reason: "no_distance" };
  }

  const passengerCount = passengerIds.length;
  const totalCo2Kg = computeTripTotalCo2Kg(distanceKm, passengerCount);
  const participants = passengerCount + 1;
  const perParticipantKg = totalCo2Kg / participants;

  const rows: (typeof ecoImpactRecords.$inferInsert)[] = [];

  rows.push({
    tripId,
    userId: trip.driverId,
    role: "driver",
    distanceKm,
    co2SavedKg: perParticipantKg,
    completedAt,
  });

  for (const pid of passengerIds) {
    rows.push({
      tripId,
      userId: pid,
      role: "passenger",
      distanceKm,
      co2SavedKg: perParticipantKg,
      completedAt,
    });
  }

  await tx.insert(ecoImpactRecords).values(rows).onConflictDoNothing({
    target: [ecoImpactRecords.tripId, ecoImpactRecords.userId],
  });

  const deltaKgRounded = Math.round(perParticipantKg);
  const ids = [trip.driverId, ...passengerIds];
  if (deltaKgRounded !== 0) {
    for (const uid of ids) {
      await tx
        .update(users)
        .set({
          co2SavedKg: sql`${users.co2SavedKg} + ${deltaKgRounded}`,
        })
        .where(eq(users.id, uid));
    }
  }

  for (const uid of ids) {
    await awardEcoBadgesForUser(tx, uid);
  }

  await tx
    .update(trips)
    .set({
      distanceKm: trip.distanceKm ?? distanceKm,
      ecoTotalCo2Kg: totalCo2Kg,
      ecoAwardedAt: completedAt,
    })
    .where(eq(trips.id, tripId));

  return { awarded: true };
}

export async function awardEcoBadgesForUser(tx: DbTx, userId: string): Promise<void> {
  const [row] = await tx
    .select({
      total: sum(ecoImpactRecords.co2SavedKg),
    })
    .from(ecoImpactRecords)
    .where(eq(ecoImpactRecords.userId, userId));

  const totalKg = row?.total != null ? Number(row.total) : 0;
  if (!Number.isFinite(totalKg) || totalKg <= 0) return;

  for (const b of ECO_BADGE_THRESHOLDS_KG) {
    if (totalKg + 1e-9 < b.thresholdKg) continue;
    await tx
      .insert(userBadges)
      .values({ userId, badgeCode: b.code })
      .onConflictDoNothing({
        target: [userBadges.userId, userBadges.badgeCode],
      });
  }
}
