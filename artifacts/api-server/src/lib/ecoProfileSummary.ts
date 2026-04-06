import {
  and,
  count,
  eq,
  isNotNull,
  sql,
  sum,
  db,
  ecoImpactRecords,
  userBadges,
  trips,
} from "@gomate/db";
import { ECO_BADGE_THRESHOLDS_KG } from "./ecoImpact.js";

export type EcoProfileSummary = {
  totalCo2Kg: number;
  driverCo2Kg: number;
  passengerCo2Kg: number;
  completedRides: number;
  badges: { code: string; awardedAt: string }[];
  nextBadge: {
    code: string;
    thresholdKg: number;
    progressKg: number;
  } | null;
};

export async function getEcoProfileSummary(userId: string): Promise<EcoProfileSummary> {
  const [driverRow] = await db
    .select({ s: sum(ecoImpactRecords.co2SavedKg) })
    .from(ecoImpactRecords)
    .where(
      and(
        eq(ecoImpactRecords.userId, userId),
        eq(ecoImpactRecords.role, "driver")
      )
    );

  const [passengerRow] = await db
    .select({ s: sum(ecoImpactRecords.co2SavedKg) })
    .from(ecoImpactRecords)
    .where(
      and(
        eq(ecoImpactRecords.userId, userId),
        eq(ecoImpactRecords.role, "passenger")
      )
    );

  const driverCo2Kg = driverRow?.s != null ? Number(driverRow.s) : 0;
  const passengerCo2Kg = passengerRow?.s != null ? Number(passengerRow.s) : 0;
  const totalCo2Kg = driverCo2Kg + passengerCo2Kg;

  const [ridesRow] = await db
    .select({
      c: sql<number>`count(distinct ${ecoImpactRecords.tripId})::int`.mapWith(Number),
    })
    .from(ecoImpactRecords)
    .where(eq(ecoImpactRecords.userId, userId));

  const completedRides = Number(ridesRow?.c ?? 0);

  const badgeRows = await db.query.userBadges.findMany({
    where: eq(userBadges.userId, userId),
    orderBy: (b, { asc }) => [asc(b.awardedAt)],
  });

  const badges = badgeRows.map((b) => ({
    code: b.badgeCode,
    awardedAt: b.awardedAt.toISOString(),
  }));

  let nextBadge: EcoProfileSummary["nextBadge"] = null;
  for (const b of ECO_BADGE_THRESHOLDS_KG) {
    if (totalCo2Kg + 1e-9 < b.thresholdKg) {
      nextBadge = {
        code: b.code,
        thresholdKg: b.thresholdKg,
        progressKg: Math.max(0, totalCo2Kg),
      };
      break;
    }
  }

  return {
    totalCo2Kg,
    driverCo2Kg,
    passengerCo2Kg,
    completedRides,
    badges,
    nextBadge,
  };
}

export async function getPublicImpactStats(): Promise<{
  completedTrips: number;
  totalCo2Kg: number;
}> {
  const [row] = await db
    .select({
      trips: count(),
      co2: sum(trips.ecoTotalCo2Kg),
    })
    .from(trips)
    .where(isNotNull(trips.ecoAwardedAt));

  return {
    completedTrips: Number(row?.trips ?? 0),
    totalCo2Kg: row?.co2 != null ? Number(row.co2) : 0,
  };
}
