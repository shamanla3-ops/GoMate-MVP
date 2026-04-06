/**
 * Seeds a small amount of database-backed demo data so public impact counters
 * (`GET /api/impact/public`) are non-zero in test/demo environments.
 *
 * SAFETY:
 * - Does not change counter formulas or app logic.
 * - Idempotent: skips if demo trips already exist (see DEMO_COMPLETION_MODE).
 * - Demo rows are marked with `completion_mode = 'demo_seed'` and a clear origin prefix.
 *
 * CLEANUP (PostgreSQL), after removing any dependent rows if your DB has FKs from other tables:
 *   DELETE FROM trips WHERE completion_mode = 'demo_seed';
 *   DELETE FROM users WHERE email = 'gomate-demo-eco-seed@local.invalid';
 *
 * Run (from repo root, with DATABASE_URL):
 *   pnpm --filter api-server seed:demo-eco
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { closeDb, count, db, eq, isNotNull, sum, trips, users } from "@gomate/db";
import { computeTripTotalCo2Kg } from "../lib/ecoImpact.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/** Must match `trips.completion_mode` for all seeded rows — easy to filter for DELETE. */
const DEMO_COMPLETION_MODE = "demo_seed";

/** Fixed demo driver — never used for real login; password is a throwaway hash. */
const DEMO_DRIVER_EMAIL = "gomate-demo-eco-seed@local.invalid";
const DEMO_DRIVER_NAME = "Demo eco seed (driver)";

/**
 * Distinct origin prefix so rows are recognizable in SQL even without completion_mode.
 * Keep in sync with cleanup docs above.
 */
const DEMO_ORIGIN_PREFIX = "[GoMate demo eco seed]";

const EXPECTED_DEMO_TRIP_COUNT = 4;

type DemoTripSpec = {
  slug: string;
  destination: string;
  distanceKm: number;
  /** Accepted passengers (eco model: solo trips avoided per passenger). */
  passengerCount: number;
};

const DEMO_TRIPS: DemoTripSpec[] = [
  {
    slug: "Short commute — 5 km",
    destination: "City center (demo)",
    distanceKm: 5.2,
    passengerCount: 1,
  },
  {
    slug: "Crosstown — 8 km",
    destination: "Office district (demo)",
    distanceKm: 8.4,
    passengerCount: 2,
  },
  {
    slug: "Suburban link — 12 km",
    destination: "Station (demo)",
    distanceKm: 12.0,
    passengerCount: 2,
  },
  {
    slug: "Ring road — 14 km",
    destination: "Campus (demo)",
    distanceKm: 14.5,
    passengerCount: 3,
  },
];

async function readPublicImpactSnapshot(): Promise<{
  completedTrips: number;
  totalCo2KgSaved: number;
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
    totalCo2KgSaved: row?.co2 != null ? Number(row.co2) : 0,
  };
}

async function main(): Promise<void> {
  const beforePublic = await readPublicImpactSnapshot();
  if (beforePublic.completedTrips > 0 || beforePublic.totalCo2KgSaved > 0) {
    console.log(
      `[seed-demo-eco-impact] Skip: public impact is already non-zero (completedTrips=${beforePublic.completedTrips}, totalCo2KgSaved=${beforePublic.totalCo2KgSaved.toFixed(2)}).`
    );
    return;
  }

  const [existingRow] = await db
    .select({ c: count() })
    .from(trips)
    .where(eq(trips.completionMode, DEMO_COMPLETION_MODE));

  const existingDemoTrips = Number(existingRow?.c ?? 0);
  if (existingDemoTrips >= EXPECTED_DEMO_TRIP_COUNT) {
    console.log(
      `[seed-demo-eco-impact] Skip: found ${existingDemoTrips} demo trips (completion_mode='${DEMO_COMPLETION_MODE}'). Already seeded.`
    );
    return;
  }

  if (existingDemoTrips > 0) {
    console.warn(
      `[seed-demo-eco-impact] Partial demo data detected (${existingDemoTrips} rows). Remove demo trips or fix manually, then re-run.`
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash("__gomate-demo-seed-not-for-login__", 10);

  await db.transaction(async (tx) => {
    let driver = await tx.query.users.findFirst({
      where: eq(users.email, DEMO_DRIVER_EMAIL),
    });

    if (!driver) {
      const [inserted] = await tx
        .insert(users)
        .values({
          email: DEMO_DRIVER_EMAIL,
          passwordHash,
          name: DEMO_DRIVER_NAME,
          role: "driver",
          language: "en",
          termsAccepted: false,
        })
        .returning();
      driver = inserted;
    }

    if (!driver) {
      throw new Error("Failed to resolve demo driver user");
    }

    const baseDay = Date.UTC(2024, 5, 3);

    for (let i = 0; i < DEMO_TRIPS.length; i += 1) {
      const spec = DEMO_TRIPS[i]!;
      const ecoTotalCo2Kg = computeTripTotalCo2Kg(spec.distanceKm, spec.passengerCount);
      const departureTime = new Date(baseDay + i * 86_400_000 + 9 * 3_600_000);
      const completedAt = new Date(departureTime.getTime() + 45 * 60_000);

      await tx.insert(trips).values({
        driverId: driver.id,
        origin: `${DEMO_ORIGIN_PREFIX} ${spec.slug}`,
        destination: spec.destination,
        originLat: 52.23,
        originLng: 21.01,
        destinationLat: 52.25,
        destinationLng: 21.05,
        departureTime,
        seatsTotal: 4,
        availableSeats: 0,
        price: 500,
        currency: "PLN",
        tripType: "one-time",
        status: "completed",
        distanceKm: spec.distanceKm,
        completedAt,
        expectedEndTime: completedAt,
        ecoTotalCo2Kg,
        ecoAwardedAt: completedAt,
        completionMode: DEMO_COMPLETION_MODE,
      });
    }
  });

  const [afterRow] = await db
    .select({ c: count() })
    .from(trips)
    .where(eq(trips.completionMode, DEMO_COMPLETION_MODE));

  const totalCo2 = DEMO_TRIPS.reduce(
    (acc, t) => acc + computeTripTotalCo2Kg(t.distanceKm, t.passengerCount),
    0
  );

  console.log(
    `[seed-demo-eco-impact] Inserted ${EXPECTED_DEMO_TRIP_COUNT} demo trips (completion_mode='${DEMO_COMPLETION_MODE}').`
  );
  console.log(
    `[seed-demo-eco-impact] Expected public impact add: trips=+${EXPECTED_DEMO_TRIP_COUNT}, co2≈+${totalCo2.toFixed(2)} kg (existing demo trips in DB: ${Number(afterRow?.c ?? 0)}).`
  );

  const afterPublic = await readPublicImpactSnapshot();
  console.log(
    `[seed-demo-eco-impact] Public impact now: completedTrips=${afterPublic.completedTrips}, totalCo2KgSaved=${afterPublic.totalCo2KgSaved.toFixed(2)}.`
  );
  if (afterPublic.completedTrips <= 0 || afterPublic.totalCo2KgSaved <= 0) {
    throw new Error(
      "Seed inserted demo records but public impact query is still zero. Check DATABASE_URL / environment."
    );
  }
}

main()
  .catch((err) => {
    console.error("[seed-demo-eco-impact] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
