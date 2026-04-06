/**
 * Removes demo impact seed rows created by `seed-demo-eco-impact.ts`.
 *
 * Run:
 *   pnpm --filter api-server cleanup:demo-eco
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { and, closeDb, count, db, eq, trips, users } from "@gomate/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DEMO_COMPLETION_MODE = "demo_seed";
const DEMO_DRIVER_EMAIL = "gomate-demo-eco-seed@local.invalid";

async function main(): Promise<void> {
  const [beforeTrips] = await db
    .select({ c: count() })
    .from(trips)
    .where(eq(trips.completionMode, DEMO_COMPLETION_MODE));

  const demoTripsBefore = Number(beforeTrips?.c ?? 0);
  if (demoTripsBefore === 0) {
    console.log("[cleanup-demo-eco-impact] No demo trips found. Nothing to clean.");
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(trips).where(eq(trips.completionMode, DEMO_COMPLETION_MODE));

    const demoUser = await tx.query.users.findFirst({
      where: eq(users.email, DEMO_DRIVER_EMAIL),
    });
    if (!demoUser) return;

    const [driverTrips] = await tx
      .select({ c: count() })
      .from(trips)
      .where(eq(trips.driverId, demoUser.id));

    if (Number(driverTrips?.c ?? 0) === 0) {
      await tx
        .delete(users)
        .where(and(eq(users.id, demoUser.id), eq(users.email, DEMO_DRIVER_EMAIL)));
    }
  });

  const [afterTrips] = await db
    .select({ c: count() })
    .from(trips)
    .where(eq(trips.completionMode, DEMO_COMPLETION_MODE));
  const demoTripsAfter = Number(afterTrips?.c ?? 0);

  console.log(
    `[cleanup-demo-eco-impact] Removed ${demoTripsBefore - demoTripsAfter} demo trips (remaining=${demoTripsAfter}).`
  );
}

main()
  .catch((err) => {
    console.error("[cleanup-demo-eco-impact] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
