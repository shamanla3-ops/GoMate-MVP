import { Router, Request, Response } from "express";
import {
  db,
  users,
  trips,
  tripRequests,
  userReviews,
  reviewTasks,
  eq,
  and,
  desc,
  count,
} from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { refreshRevieweeRating } from "../lib/reviewRating.js";
import { jsonApiError } from "../lib/apiErrors.js";
import { withApiSuccess } from "../lib/apiSuccess.js";

const router: Router = Router();

function tripAllowsReviews(trip: typeof trips.$inferSelect): boolean {
  if (trip.status === "cancelled") return false;
  return trip.status === "completed";
}

/** GET /api/reviews?subjectId=uuid — public list of reviews received by user */
router.get("/", async (req: Request, res: Response) => {
  try {
    const subjectId = String(req.query.subjectId ?? "").trim();
    if (!subjectId) {
      jsonApiError(res, 400, "REVIEWS_SUBJECT_REQUIRED");
      return;
    }

    const rows = await db
      .select({
        id: userReviews.id,
        tripId: userReviews.tripId,
        rating: userReviews.rating,
        comment: userReviews.comment,
        tripHappened: userReviews.tripHappened,
        noShowReason: userReviews.noShowReason,
        createdAt: userReviews.createdAt,
        authorName: users.name,
        origin: trips.origin,
        destination: trips.destination,
      })
      .from(userReviews)
      .innerJoin(users, eq(userReviews.authorId, users.id))
      .innerJoin(trips, eq(userReviews.tripId, trips.id))
      .where(eq(userReviews.revieweeId, subjectId))
      .orderBy(desc(userReviews.createdAt));

    res.json({
      reviews: rows.map((r) => ({
        id: r.id,
        tripId: r.tripId,
        tripLabel: `${r.origin} → ${r.destination}`,
        authorName: r.authorName,
        rating: r.rating,
        comment: r.comment,
        tripHappened: r.tripHappened,
        noShowReason: r.noShowReason,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("List reviews error:", err);
    jsonApiError(res, 500, "REVIEWS_LIST_FAILED");
  }
});

/** GET /api/reviews/eligible/:tripId — who the current user can still review on this trip */
router.get(
  "/eligible/:tripId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        jsonApiError(res, 401, "UNAUTHORIZED");
        return;
      }

      const tripId = String(req.params.tripId ?? "").trim();
      if (!tripId) {
        jsonApiError(res, 400, "TRIP_ID_REQUIRED");
        return;
      }

      const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
      });

      if (!trip) {
        jsonApiError(res, 404, "TRIP_NOT_FOUND");
        return;
      }

      if (!tripAllowsReviews(trip)) {
        res.json({ targets: [] });
        return;
      }

      const [taskCountRow] = await db
        .select({ c: count() })
        .from(reviewTasks)
        .where(eq(reviewTasks.tripId, tripId));
      const taskCount = Number(taskCountRow?.c ?? 0);

      const existing = await db
        .select({ revieweeId: userReviews.revieweeId })
        .from(userReviews)
        .where(
          and(
            eq(userReviews.tripId, tripId),
            eq(userReviews.authorId, userId)
          )
        );
      const reviewedIds = new Set(existing.map((e) => e.revieweeId));

      if (taskCount > 0) {
        const pendingRows = await db
          .select({
            targetUserId: reviewTasks.targetUserId,
            targetName: users.name,
          })
          .from(reviewTasks)
          .innerJoin(users, eq(reviewTasks.targetUserId, users.id))
          .where(
            and(
              eq(reviewTasks.tripId, tripId),
              eq(reviewTasks.reviewerUserId, userId),
              eq(reviewTasks.status, "pending")
            )
          );

        const targets = pendingRows
          .filter((row) => !reviewedIds.has(row.targetUserId))
          .map((row) => ({ userId: row.targetUserId, name: row.targetName }));

        res.json({ targets });
        return;
      }

      const targets: { userId: string; name: string }[] = [];

      if (trip.driverId === userId) {
        const accepted = await db.query.tripRequests.findMany({
          where: and(
            eq(tripRequests.tripId, tripId),
            eq(tripRequests.status, "accepted")
          ),
        });

        for (const r of accepted) {
          if (reviewedIds.has(r.passengerId)) continue;
          const p = await db.query.users.findFirst({
            where: eq(users.id, r.passengerId),
          });
          if (p) {
            targets.push({ userId: p.id, name: p.name });
          }
        }
      } else {
        const reqRow = await db.query.tripRequests.findFirst({
          where: and(
            eq(tripRequests.tripId, tripId),
            eq(tripRequests.passengerId, userId),
            eq(tripRequests.status, "accepted")
          ),
        });

        if (reqRow && trip.driverId !== userId) {
          if (!reviewedIds.has(trip.driverId)) {
            const d = await db.query.users.findFirst({
              where: eq(users.id, trip.driverId),
            });
            if (d) {
              targets.push({ userId: d.id, name: d.name });
            }
          }
        }
      }

      res.json({ targets });
    } catch (err) {
      console.error("Eligible reviews error:", err);
      jsonApiError(res, 500, "REVIEWS_ELIGIBLE_FAILED");
    }
  }
);

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const { tripId, revieweeId, rating, comment } = req.body as {
      tripId?: string;
      revieweeId?: string;
      rating?: unknown;
      comment?: unknown;
    };

    const tId = typeof tripId === "string" ? tripId.trim() : "";
    const rId = typeof revieweeId === "string" ? revieweeId.trim() : "";
    const rNum = Number(rating);

    if (!tId || !rId) {
      jsonApiError(res, 400, "REVIEWS_BODY_INVALID");
      return;
    }

    if (!Number.isFinite(rNum) || rNum < 1 || rNum > 5 || !Number.isInteger(rNum)) {
      jsonApiError(res, 400, "REVIEWS_RATING_INVALID");
      return;
    }

    if (rId === userId) {
      jsonApiError(res, 400, "REVIEWS_SELF_FORBIDDEN");
      return;
    }

    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, tId),
    });

    if (!trip) {
      jsonApiError(res, 404, "TRIP_NOT_FOUND");
      return;
    }

    if (!tripAllowsReviews(trip)) {
      if (trip.status === "scheduled") {
        jsonApiError(res, 400, "REVIEWS_TRIP_NOT_COMPLETED");
        return;
      }
      jsonApiError(res, 400, "REVIEWS_NOT_ALLOWED");
      return;
    }

    let allowed = false;

    if (trip.driverId === userId) {
      const acc = await db.query.tripRequests.findFirst({
        where: and(
          eq(tripRequests.tripId, tId),
          eq(tripRequests.passengerId, rId),
          eq(tripRequests.status, "accepted")
        ),
      });
      allowed = Boolean(acc);
    } else {
      const selfReq = await db.query.tripRequests.findFirst({
        where: and(
          eq(tripRequests.tripId, tId),
          eq(tripRequests.passengerId, userId),
          eq(tripRequests.status, "accepted")
        ),
      });
      allowed = Boolean(selfReq) && rId === trip.driverId;
    }

    if (!allowed) {
      jsonApiError(res, 403, "REVIEWS_FORBIDDEN_TARGET");
      return;
    }

    const [taskCountRow] = await db
      .select({ c: count() })
      .from(reviewTasks)
      .where(eq(reviewTasks.tripId, tId));
    const taskCount = Number(taskCountRow?.c ?? 0);

    if (taskCount > 0) {
      const pendingTask = await db.query.reviewTasks.findFirst({
        where: and(
          eq(reviewTasks.tripId, tId),
          eq(reviewTasks.reviewerUserId, userId),
          eq(reviewTasks.targetUserId, rId),
          eq(reviewTasks.status, "pending")
        ),
      });
      if (!pendingTask) {
        jsonApiError(res, 403, "REVIEW_TASK_REQUIRED");
        return;
      }
    }

    const commentText =
      typeof comment === "string" ? comment.trim().slice(0, 2000) : null;

    if (rNum <= 3 && (!commentText || commentText.length === 0)) {
      jsonApiError(res, 400, "REVIEWS_COMMENT_REQUIRED");
      return;
    }

    await db.insert(userReviews).values({
      tripId: tId,
      authorId: userId,
      revieweeId: rId,
      rating: rNum,
      comment: commentText && commentText.length > 0 ? commentText : null,
      tripHappened: true,
      noShowReason: null,
    });

    await db
      .update(reviewTasks)
      .set({ status: "done" })
      .where(
        and(
          eq(reviewTasks.tripId, tId),
          eq(reviewTasks.reviewerUserId, userId),
          eq(reviewTasks.targetUserId, rId),
          eq(reviewTasks.status, "pending")
        )
      );

    await refreshRevieweeRating(rId);

    res.status(201).json(withApiSuccess({ success: true }, "REVIEW_SUBMITTED"));
  } catch (err) {
    console.error("Create review error:", err);
    const pg =
      typeof err === "object" && err !== null
        ? (err as { code?: string })
        : {};
    if (pg.code === "23505") {
      jsonApiError(res, 409, "REVIEWS_DUPLICATE");
      return;
    }
    if (pg.code === "42703" || pg.code === "42P01") {
      jsonApiError(res, 500, "DATABASE_SCHEMA_OUTDATED_REVIEWS");
      return;
    }
    jsonApiError(res, 500, "REVIEWS_SUBMIT_FAILED");
  }
});

export default router;
