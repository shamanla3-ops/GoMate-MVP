import {
  db,
  reviewTasks,
  userReviews,
  eq,
  and,
  inArray,
} from "@gomate/db";

/** Matches user_reviews (trip_id, author_id, reviewee_id) to a review task target. */
export function reviewTargetKey(tripId: string, targetUserId: string): string {
  return `${tripId}:${targetUserId}`;
}

export async function loadReviewedTargetKeysForReviewer(
  reviewerUserId: string
): Promise<Set<string>> {
  const rows = await db
    .select({
      tripId: userReviews.tripId,
      revieweeId: userReviews.revieweeId,
    })
    .from(userReviews)
    .where(eq(userReviews.authorId, reviewerUserId));

  return new Set(
    rows.map((r) => reviewTargetKey(r.tripId, r.revieweeId))
  );
}

/**
 * Pending tasks whose target already has a user_review from this reviewer are stale.
 * Marks them `done` and returns IDs of tasks that are still truly pending.
 */
export async function reconcilePendingReviewTasks(
  reviewerUserId: string,
  tasks: { id: string; tripId: string; targetUserId: string }[]
): Promise<Set<string>> {
  if (tasks.length === 0) {
    return new Set();
  }

  const reviewed = await loadReviewedTargetKeysForReviewer(reviewerUserId);
  const staleIds = tasks
    .filter((t) => reviewed.has(reviewTargetKey(t.tripId, t.targetUserId)))
    .map((t) => t.id);

  if (staleIds.length > 0) {
    await db
      .update(reviewTasks)
      .set({ status: "done" })
      .where(
        and(eq(reviewTasks.status, "pending"), inArray(reviewTasks.id, staleIds))
      );
  }

  const stale = new Set(staleIds);
  return new Set(tasks.map((t) => t.id).filter((id) => !stale.has(id)));
}

export async function countReconciledPendingReviewTasks(
  reviewerUserId: string,
  tasks: { id: string; tripId: string; targetUserId: string }[]
): Promise<number> {
  const active = await reconcilePendingReviewTasks(reviewerUserId, tasks);
  return active.size;
}
