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
} from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { refreshRevieweeRating } from "../lib/reviewRating.js";

const router: Router = Router();

function tripAllowsReviews(trip: typeof trips.$inferSelect): boolean {
  if (trip.status === "cancelled") return false;
  if (trip.status === "completed") return true;
  const dep = new Date(trip.departureTime);
  return dep.getTime() <= Date.now();
}

/** GET /api/reviews?subjectId=uuid — public list of reviews received by user */
router.get("/", async (req: Request, res: Response) => {
  try {
    const subjectId = String(req.query.subjectId ?? "").trim();
    if (!subjectId) {
      res.status(400).json({ error: "subjectId query is required" });
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
    res.status(500).json({ error: "Failed to load reviews" });
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
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const tripId = String(req.params.tripId ?? "").trim();
      if (!tripId) {
        res.status(400).json({ error: "tripId is required" });
        return;
      }

      const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
      });

      if (!trip) {
        res.status(404).json({ error: "Trip not found" });
        return;
      }

      if (!tripAllowsReviews(trip)) {
        res.json({ targets: [] });
        return;
      }

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
      res.status(500).json({ error: "Failed to load review targets" });
    }
  }
);

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
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
      res.status(400).json({ error: "tripId and revieweeId are required" });
      return;
    }

    if (!Number.isFinite(rNum) || rNum < 1 || rNum > 5 || !Number.isInteger(rNum)) {
      res.status(400).json({ error: "rating must be an integer from 1 to 5" });
      return;
    }

    if (rId === userId) {
      res.status(400).json({ error: "You cannot review yourself" });
      return;
    }

    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, tId),
    });

    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    if (!tripAllowsReviews(trip)) {
      res.status(400).json({
        error:
          "Reviews are available after the trip is completed or departure time for accepted participants",
      });
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
      res.status(403).json({
        error: "You can only review your driver or accepted passengers on this trip",
      });
      return;
    }

    const commentText =
      typeof comment === "string" ? comment.trim().slice(0, 2000) : null;

    if (rNum <= 3 && (!commentText || commentText.length === 0)) {
      res.status(400).json({
        error: "Comment is required when rating is 3 or lower",
      });
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

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Create review error:", err);
    const pg =
      typeof err === "object" && err !== null
        ? (err as { code?: string })
        : {};
    if (pg.code === "23505") {
      res.status(409).json({ error: "You already reviewed this person for this trip" });
      return;
    }
    if (pg.code === "42703" || pg.code === "42P01") {
      res.status(500).json({
        error: "Database schema is out of date. Run migrations for user_reviews.",
      });
      return;
    }
    res.status(500).json({ error: "Failed to submit review" });
  }
});

export default router;
