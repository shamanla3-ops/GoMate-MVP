import { Router, Response } from "express";
import { db, users, userReviews, eq, count } from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

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
    reviewCount,
  };
}

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [countRow] = await db
      .select({ c: count() })
      .from(userReviews)
      .where(eq(userReviews.revieweeId, userId));

    res.json({ user: mapUser(user, Number(countRow?.c ?? 0)) });
  } catch (err) {
    console.error("Profile GET error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.put("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
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
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const avatarUrl =
      typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    if (avatarUrl.length > MAX_AVATAR_URL_LENGTH) {
      res.status(400).json({
        error: "Avatar is too large. Use a smaller image (max ~2 MB).",
      });
      return;
    }

    let age: number | null = null;
    if (body.age !== undefined && body.age !== null && String(body.age).trim() !== "") {
      const n = Number(body.age);
      if (!Number.isFinite(n) || n < 1 || n > 120) {
        res.status(400).json({ error: "Age must be between 1 and 120" });
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
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [countRow] = await db
      .select({ c: count() })
      .from(userReviews)
      .where(eq(userReviews.revieweeId, userId));

    res.json({
      user: mapUser(updated, Number(countRow?.c ?? 0)),
      message: "Profile saved",
    });
  } catch (err) {
    console.error("Profile PUT error:", err);
    const pg =
      typeof err === "object" && err !== null
        ? (err as { code?: string })
        : {};
    if (pg.code === "42703") {
      res.status(500).json({
        error:
          "Database schema is out of date. Run migrations (including user_reviews).",
      });
      return;
    }
    res.status(500).json({ error: "Failed to save profile" });
  }
});

export default router;
