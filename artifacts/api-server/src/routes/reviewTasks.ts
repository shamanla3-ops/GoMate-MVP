import { Router, Response } from "express";
import {
  db,
  trips,
  tripRequests,
  reviewTasks,
  userReviews,
  users,
  eq,
  and,
  desc,
} from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { refreshRevieweeRating } from "../lib/reviewRating.js";

const router: Router = Router();

const NO_SHOW_REASONS = new Set([
  "driver_no_show",
  "passenger_no_show",
  "trip_cancelled",
  "other",
]);

/** GET /api/review-tasks/pending */
router.get("/pending", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const rows = await db
      .select({
        id: reviewTasks.id,
        tripId: reviewTasks.tripId,
        targetUserId: reviewTasks.targetUserId,
        targetName: users.name,
        origin: trips.origin,
        destination: trips.destination,
        createdAt: reviewTasks.createdAt,
      })
      .from(reviewTasks)
      .innerJoin(trips, eq(reviewTasks.tripId, trips.id))
      .innerJoin(users, eq(reviewTasks.targetUserId, users.id))
      .where(
        and(
          eq(reviewTasks.reviewerUserId, userId),
          eq(reviewTasks.status, "pending")
        )
      )
      .orderBy(desc(reviewTasks.createdAt));

    res.json({
      tasks: rows.map((r) => ({
        id: r.id,
        tripId: r.tripId,
        targetUserId: r.targetUserId,
        targetName: r.targetName,
        tripLabel: `${r.origin} → ${r.destination}`,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("review-tasks pending error:", err);
    res.status(500).json({ error: "Failed to load review tasks" });
  }
});

/** POST /api/review-tasks/:taskId/submit */
router.post(
  "/:taskId/submit",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const taskId = String(req.params.taskId ?? "").trim();
      if (!taskId) {
        res.status(400).json({ error: "taskId is required" });
        return;
      }

      const task = await db.query.reviewTasks.findFirst({
        where: eq(reviewTasks.id, taskId),
      });

      if (!task || task.reviewerUserId !== userId) {
        res.status(404).json({ error: "Review task not found" });
        return;
      }

      if (task.status !== "pending") {
        res.status(409).json({ error: "This review task is no longer pending" });
        return;
      }

      const trip = await db.query.trips.findFirst({
        where: eq(trips.id, task.tripId),
      });

      if (!trip || trip.status === "cancelled") {
        res.status(400).json({ error: "Trip is not available for review" });
        return;
      }

      const body = req.body as {
        tripHappened?: unknown;
        rating?: unknown;
        comment?: unknown;
        noShowReason?: unknown;
      };

      const tripHappened =
        body.tripHappened === false || body.tripHappened === "false"
          ? false
          : true;

      let rating: number | null = null;
      let commentText: string | null = null;
      let noShowReason: string | null = null;

      if (tripHappened) {
        const rNum = Number(body.rating);
        if (
          !Number.isFinite(rNum) ||
          !Number.isInteger(rNum) ||
          rNum < 1 ||
          rNum > 5
        ) {
          res.status(400).json({ error: "rating must be an integer from 1 to 5" });
          return;
        }
        rating = rNum;
        const c =
          typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";
        if (rNum <= 3 && c.length === 0) {
          res.status(400).json({
            error: "Comment is required when rating is 3 or lower",
          });
          return;
        }
        commentText = c.length > 0 ? c : null;
      } else {
        const reason =
          typeof body.noShowReason === "string" ? body.noShowReason.trim() : "";
        if (!NO_SHOW_REASONS.has(reason)) {
          res.status(400).json({ error: "Invalid noShowReason" });
          return;
        }
        noShowReason = reason;
        const c =
          typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";
        commentText = c.length > 0 ? c : null;
      }

      const allowed = await validateParticipantRelationship(
        trip,
        userId,
        task.targetUserId
      );
      if (!allowed) {
        res.status(403).json({ error: "Invalid review relationship for this trip" });
        return;
      }

      await db.insert(userReviews).values({
        tripId: task.tripId,
        authorId: userId,
        revieweeId: task.targetUserId,
        rating,
        comment: commentText,
        tripHappened,
        noShowReason: tripHappened ? null : noShowReason,
      });

      await db
        .update(reviewTasks)
        .set({ status: "done" })
        .where(eq(reviewTasks.id, taskId));

      await refreshRevieweeRating(task.targetUserId);

      res.status(201).json({ success: true });
    } catch (err) {
      console.error("review-tasks submit error:", err);
      const pg =
        typeof err === "object" && err !== null
          ? (err as { code?: string })
          : {};
      if (pg.code === "23505") {
        res
          .status(409)
          .json({ error: "You already reviewed this person for this trip" });
        return;
      }
      res.status(500).json({ error: "Failed to submit review" });
    }
  }
);

async function validateParticipantRelationship(
  trip: typeof trips.$inferSelect,
  reviewerId: string,
  targetId: string
): Promise<boolean> {
  if (reviewerId === targetId) return false;

  if (trip.driverId === reviewerId) {
    const acc = await db.query.tripRequests.findFirst({
      where: and(
        eq(tripRequests.tripId, trip.id),
        eq(tripRequests.passengerId, targetId),
        eq(tripRequests.status, "accepted")
      ),
    });
    return Boolean(acc);
  }

  if (trip.driverId === targetId) {
    const self = await db.query.tripRequests.findFirst({
      where: and(
        eq(tripRequests.tripId, trip.id),
        eq(tripRequests.passengerId, reviewerId),
        eq(tripRequests.status, "accepted")
      ),
    });
    return Boolean(self);
  }

  return false;
}

export default router;
