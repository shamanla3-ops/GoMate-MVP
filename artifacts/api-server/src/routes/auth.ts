import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, users, eq } from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

const router: Router = Router();
const SALT_ROUNDS = 10;

function signToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");

  return jwt.sign({ userId, email }, secret, { expiresIn: "7d" });
}

function mapUser(user: typeof users.$inferSelect) {
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

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password || !name) {
      res.status(400).json({
        error: "Missing required fields: email, password, name",
      });
      return;
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        name: name.trim(),
      })
      .returning();

    const token = signToken(user.id, user.email);

    res.status(201).json({
      token,
      user: mapUser(user),
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Missing email or password" });
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user.id, user.email);

    res.json({
      token,
      user: mapUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.user!;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: mapUser(user) });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

export default router;