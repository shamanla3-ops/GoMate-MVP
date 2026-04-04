import {
  db,
  trips,
  tripRequests,
  reviewTasks,
  eq,
  and,
  lte,
} from "@gomate/db";
import { sendPushToUser } from "../routes/push.js";

/** Must pass after expected end before trip is auto-completed */
const GRACE_AFTER_END_MS = 60 * 60 * 1000;

/** Pending review tasks older than this → expired */
const REVIEW_TASK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function expectedEndDate(trip: typeof trips.$inferSelect): Date {
  if (trip.expectedEndTime) {
    return new Date(trip.expectedEndTime);
  }
  const dep = new Date(trip.departureTime).getTime();
  const mins = trip.estimatedDurationMinutes ?? 60;
  return new Date(dep + mins * 60 * 1000);
}

function shouldAutoCompleteNow(trip: typeof trips.$inferSelect): boolean {
  if (trip.status !== "scheduled") return false;
  const end = expectedEndDate(trip).getTime();
  return Date.now() >= end + GRACE_AFTER_END_MS;
}

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

export async function runAutoCompleteTrips(): Promise<{
  completedTrips: number;
  reviewTasksCreated: number;
}> {
  const scheduled = await db.query.trips.findMany({
    where: eq(trips.status, "scheduled"),
  });

  let completedTrips = 0;
  let reviewTasksCreated = 0;

  for (const trip of scheduled) {
    if (!shouldAutoCompleteNow(trip)) continue;

    const accepted = await db.query.tripRequests.findMany({
      where: and(
        eq(tripRequests.tripId, trip.id),
        eq(tripRequests.status, "accepted")
      ),
    });

    await db
      .update(trips)
      .set({
        status: "completed",
        completedAt: new Date(),
        completionMode: "automatic",
      })
      .where(eq(trips.id, trip.id));

    completedTrips += 1;

    const taskRows: {
      tripId: string;
      reviewerUserId: string;
      targetUserId: string;
      status: "pending";
    }[] = [];

    for (const req of accepted) {
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

    if (taskRows.length > 0) {
      await db.insert(reviewTasks).values(taskRows).onConflictDoNothing();
      reviewTasksCreated += taskRows.length;
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
