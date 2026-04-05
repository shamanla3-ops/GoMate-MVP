import { Router, Response } from "express";
import { db, users, userReviews, eq, and, count, isNotNull } from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { jsonApiError } from "../lib/apiErrors.js";
import { withApiSuccess } from "../lib/apiSuccess.js";

const router: Router = Router();

const MAX_AVATAR_URL_LENGTH = 2_500_000;

function mapUser(user: typeof users.$inferSelect, reviewCount: number) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    language: user.language,
    avatarUrl: user.avatarUrl,
    phoneNumber: user.phoneNumber,
    carBrand: user.carBrand,
    carModel: user.carModel,
    carColor: user.carColor,
    carPlateNumber: user.carPlateNumber,
    age: user.age,
    rating: user.rating,
    co2SavedKg: user.co2SavedKg,
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
    reviewCount,
  };
}

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      jsonApiError(res, 404, "USER_NOT_FOUND");
      return;
    }

    const [countRow] = await db
      .select({ c: count() })
      .from(userReviews)
      .where(
        and(
          eq(userReviews.revieweeId, userId),
          eq(userReviews.tripHappened, true),
          isNotNull(userReviews.rating)
        )
      );

    res.json({ user: mapUser(user, Number(countRow?.c ?? 0)) });
  } catch (err) {
    console.error("Profile GET error:", err);
    jsonApiError(res, 500, "PROFILE_LOAD_FAILED");
  }
});

router.put("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const body = req.body as {
      name?: string;
      phoneNumber?: string;
      carBrand?: string;
      carModel?: string;
      carColor?: string;
      carPlateNumber?: string;
      age?: string;
      avatarUrl?: string;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      jsonApiError(res, 400, "PROFILE_NAME_REQUIRED");
      return;
    }

    const avatarUrl =
      typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    if (avatarUrl.length > MAX_AVATAR_URL_LENGTH) {
      jsonApiError(res, 400, "PROFILE_AVATAR_TOO_LARGE");
      return;
    }

    let age: number | null = null;
    if (body.age !== undefined && body.age !== null && String(body.age).trim() !== "") {
      const n = Number(body.age);
      if (!Number.isFinite(n) || n < 1 || n > 120) {
        jsonApiError(res, 400, "PROFILE_AGE_INVALID");
        return;
      }
      age = Math.round(n);
    }

    const toNullIfEmpty = (v: unknown) => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t === "" ? null : t;
    };

    const [updated] = await db
      .update(users)
      .set({
        name,
        phoneNumber: toNullIfEmpty(body.phoneNumber),
        carBrand: toNullIfEmpty(body.carBrand),
        carModel: toNullIfEmpty(body.carModel),
        carColor: toNullIfEmpty(body.carColor),
        carPlateNumber: toNullIfEmpty(body.carPlateNumber),
        age,
        avatarUrl: avatarUrl === "" ? null : avatarUrl,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      jsonApiError(res, 404, "USER_NOT_FOUND");
      return;
    }

    const [countRow] = await db
      .select({ c: count() })
      .from(userReviews)
      .where(
        and(
          eq(userReviews.revieweeId, userId),
          eq(userReviews.tripHappened, true),
          isNotNull(userReviews.rating)
        )
      );

    res.json(
      withApiSuccess(
        { user: mapUser(updated, Number(countRow?.c ?? 0)) },
        "PROFILE_SAVED"
      )
    );
  } catch (err) {
    console.error("Profile PUT error:", err);
    const pg =
      typeof err === "object" && err !== null
        ? (err as { code?: string })
        : {};
    if (pg.code === "42703") {
      jsonApiError(res, 500, "DATABASE_SCHEMA_OUTDATED");
      return;
    }
    jsonApiError(res, 500, "PROFILE_SAVE_FAILED");
  }
});

export default router;
