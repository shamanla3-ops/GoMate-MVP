import { Router, Response } from "express";
import { db, eq, users } from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

const router: Router = Router();

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeAge(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const age = Number(value);

  if (!Number.isInteger(age) || age < 18 || age > 100) {
    throw new Error("Возраст должен быть целым числом от 18 до 100");
  }

  return age;
}

function normalizeAvatar(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith("data:image/")) {
    throw new Error("Аватар должен быть изображением");
  }

  if (trimmed.length > 8_000_000) {
    throw new Error("Аватар слишком большой");
  }

  return trimmed;
}

function mapUserProfile(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
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
  };
}

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.user!;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    res.json({ user: mapUserProfile(user) });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Не удалось загрузить профиль" });
  }
});

router.put("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.user!;

    const payload = {
      name: normalizeText(req.body.name, 255),
      phoneNumber: normalizeText(req.body.phoneNumber, 50),
      carBrand: normalizeText(req.body.carBrand, 100),
      carModel: normalizeText(req.body.carModel, 100),
      carColor: normalizeText(req.body.carColor, 100),
      carPlateNumber: normalizeText(req.body.carPlateNumber, 50),
      age: normalizeAge(req.body.age),
      avatarUrl: normalizeAvatar(req.body.avatarUrl),
    };

    if (!payload.name) {
      res.status(400).json({ error: "Имя обязательно" });
      return;
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        carBrand: payload.carBrand,
        carModel: payload.carModel,
        carColor: payload.carColor,
        carPlateNumber: payload.carPlateNumber,
        age: payload.age,
        avatarUrl: payload.avatarUrl,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    res.json({
      message: "Профиль сохранён",
      user: mapUserProfile(updatedUser),
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Не удалось сохранить профиль" });
  }
});

export default router;