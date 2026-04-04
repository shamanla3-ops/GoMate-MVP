import { db, users, userReviews, eq } from "@gomate/db";

export async function refreshRevieweeRating(revieweeId: string) {
  const rows = await db
    .select({ rating: userReviews.rating })
    .from(userReviews)
    .where(eq(userReviews.revieweeId, revieweeId));

  const valid = rows.filter(
    (r) => typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5
  );

  const rating =
    valid.length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            5,
            Math.round(
              valid.reduce((sum, r) => sum + (r.rating as number), 0) /
                valid.length
            )
          )
        );

  await db.update(users).set({ rating }).where(eq(users.id, revieweeId));
}
