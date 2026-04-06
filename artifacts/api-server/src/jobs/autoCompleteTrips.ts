import {
  db,
  trips,
  tripRequests,
  reviewTasks,
  eq,
  and,
  lte,
  isNull,
} from "@gomate/db";
import { sendPushToUser } from "../routes/push.js";
import {
  repairScheduledTripTiming,
  shouldAutoCompleteScheduledTrip,
} from "../lib/tripTiming.js";
import { awardEcoImpactForCompletedTrip } from "../lib/ecoImpact.js";

/** Pending review tasks older than this → expired */
const REVIEW_TASK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function expireOldReviewTasks(): Promise<number> {
  const cutoff = new Date(Date.now() - REVIEW_TASK_TTL_MS);
  const updated = await db
    .update(reviewTasks)
    .set({ status: "expired" })
    .where(
      and(
        eq(reviewTasks.status, "pending"),
        lte(reviewTasks.createdAt, cutoff)
      )
    )
    .returning({ id: reviewTasks.id });

  return updated.length;
}

/** One row per passenger: duplicate accepted rows would break batched insert (unique conflict in one statement). */
function dedupeAcceptedPassengers(
  rows: { passengerId: string }[]
): { passengerId: string }[] {
  const seen = new Set<string>();
  const out: { passengerId: string }[] = [];
  for (const r of rows) {
    if (seen.has(r.passengerId)) continue;
    seen.add(r.passengerId);
    out.push(r);
  }
  return out;
}

export async function runAutoCompleteTrips(): Promise<{
  completedTrips: number;
  reviewTasksCreated: number;
}> {
  const scheduled = await db.query.trips.findMany({
    where: eq(trips.status, "scheduled"),
  });

  let completedTrips = 0;
  let reviewTasksCreated = 0;

  for (const rawTrip of scheduled) {
    const trip = await repairScheduledTripTiming(rawTrip);

    if (!shouldAutoCompleteScheduledTrip(trip)) continue;

    const acceptedRaw = await db.query.tripRequests.findMany({
      where: and(
        eq(tripRequests.tripId, trip.id),
        eq(tripRequests.status, "accepted")
      ),
    });

    const accepted = dedupeAcceptedPassengers(acceptedRaw);

    const taskRows: {
      tripId: string;
      reviewerUserId: string;
      targetUserId: string;
      status: "pending";
    }[] = [];

    for (const req of accepted) {
      if (req.passengerId === trip.driverId) {
        continue;
      }
      taskRows.push({
        tripId: trip.id,
        reviewerUserId: req.passengerId,
        targetUserId: trip.driverId,
        status: "pending",
      });
      taskRows.push({
        tripId: trip.id,
        reviewerUserId: trip.driverId,
        targetUserId: req.passengerId,
        status: "pending",
      });
    }

    const completedAt = new Date();

    const result = await db.transaction(async (tx) => {
      const [updatedTrip] = await tx
        .update(trips)
        .set({
          status: "completed",
          completedAt,
          completionMode: "automatic",
        })
        .where(and(eq(trips.id, trip.id), eq(trips.status, "scheduled")))
        .returning({ id: trips.id });

      if (!updatedTrip) {
        return { completed: false as const, inserted: [] as { id: string }[] };
      }

      await awardEcoImpactForCompletedTrip(tx, trip.id, completedAt);

      if (taskRows.length === 0) {
        return { completed: true as const, inserted: [] as { id: string }[] };
      }

      const insertedRows = await tx
        .insert(reviewTasks)
        .values(taskRows)
        .onConflictDoNothing({
          target: [
            reviewTasks.tripId,
            reviewTasks.reviewerUserId,
            reviewTasks.targetUserId,
          ],
        })
        .returning({ id: reviewTasks.id });

      return { completed: true as const, inserted: insertedRows };
    });

    if (!result.completed) {
      continue;
    }

    completedTrips += 1;
    reviewTasksCreated += result.inserted.length;

    const [claimed] = await db
      .update(trips)
      .set({ completionPushSentAt: new Date() })
      .where(
        and(
          eq(trips.id, trip.id),
          eq(trips.status, "completed"),
          isNull(trips.completionPushSentAt)
        )
      )
      .returning({ id: trips.id });

    if (!claimed) {
      continue;
    }

    for (const req of accepted) {
      await sendPushToUser(req.passengerId, {
        title: "Trip completed",
        body: "Your trip is completed. Rate the driver.",
        url: `/trips/${trip.id}`,
      });
    }

    if (accepted.length > 0) {
      await sendPushToUser(trip.driverId, {
        title: "Trip completed",
        body: "Trip completed. Rate your passengers.",
        url: `/trips/${trip.id}`,
      });
    }
  }

  return { completedTrips, reviewTasksCreated };
}

export async function runTripMaintenanceJobs(): Promise<void> {
  try {
    const expired = await expireOldReviewTasks();
    const { completedTrips, reviewTasksCreated } = await runAutoCompleteTrips();
    if (completedTrips > 0 || reviewTasksCreated > 0 || expired > 0) {
      console.log("[jobs] trip maintenance", {
        completedTrips,
        reviewTasksCreated,
        reviewTasksExpired: expired,
      });
    }
  } catch (e) {
    console.error("[jobs] trip maintenance error", e);
  }
}

export function startTripMaintenanceJobs(): void {
  const intervalMs = Number(process.env.TRIP_JOB_INTERVAL_MS ?? 5 * 60 * 1000);
  void runTripMaintenanceJobs();
  setInterval(() => {
    void runTripMaintenanceJobs();
  }, intervalMs);
  console.log(`[jobs] Trip maintenance every ${intervalMs}ms`);
}
