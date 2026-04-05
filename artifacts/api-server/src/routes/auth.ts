import { Router, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, users, eq } from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { jsonApiError } from "../lib/apiErrors.js";
import { withApiSuccess } from "../lib/apiSuccess.js";
import { sendVerificationEmail } from "../lib/email.js";

const router: Router = Router();
const SALT_ROUNDS = 10;

const VERIFICATION_EMAIL_RESEND_COOLDOWN_MS = 60_000;

type UserLanguage = (typeof users.$inferSelect)["language"];

function signToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");

  return jwt.sign({ userId, email }, secret, { expiresIn: "7d" });
}

function normalizeLanguage(value?: string): UserLanguage {
  if (
    value === "pl" ||
    value === "en" ||
    value === "de" ||
    value === "ru" ||
    value === "uk" ||
    value === "es"
  ) {
    return value;
  }

  return "pl";
}

const RESEND_VERIFICATION_GENERIC_MESSAGE =
  "If this email exists and is not verified, a new verification email has been sent.";

function mapUser(user: typeof users.$inferSelect, reviewCount?: number) {
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
    reviewCount: reviewCount ?? 0,
  };
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isWithinVerificationResendCooldown(sentAt: Date | null): boolean {
  if (sentAt === null) {
    return false;
  }
  const ageMs = Date.now() - sentAt.getTime();
  return ageMs >= 0 && ageMs < VERIFICATION_EMAIL_RESEND_COOLDOWN_MS;
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name, language } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      language?: string;
    };

    if (!email || !password || !name) {
      jsonApiError(res, 400, "AUTH_REGISTER_FIELDS_MISSING");
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    const existing = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existing) {
      jsonApiError(res, 409, "AUTH_EMAIL_IN_USE");
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const normalizedLanguage = normalizeLanguage(language);
    const emailVerificationToken = randomUUID();
    const emailVerificationSentAt = new Date();

    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        language: normalizedLanguage,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationSentAt,
      })
      .returning();

    try {
      await sendVerificationEmail(
        user.email,
        emailVerificationToken,
        user.name
      );
    } catch (mailErr) {
      console.error("sendVerificationEmail (register):", mailErr);
    }

    res.status(201).json({
      success: true,
      message: "Account created. Please verify your email.",
    });
  } catch (err) {
    console.error("Register error:", err);
    const pg =
      typeof err === "object" && err !== null
        ? (err as { code?: string })
        : {};
    if (pg.code === "42703" || pg.code === "42P01") {
      jsonApiError(res, 500, "DATABASE_SCHEMA_OUTDATED");
      return;
    }
    jsonApiError(res, 500, "AUTH_REGISTRATION_FAILED");
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password, language } = req.body as {
      email?: string;
      password?: string;
      language?: string;
    };

    if (!email || !password) {
      jsonApiError(res, 400, "AUTH_LOGIN_FIELDS_MISSING");
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizeEmail(email)));

    if (!user) {
      jsonApiError(res, 401, "AUTH_INVALID_CREDENTIALS");
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      jsonApiError(res, 401, "AUTH_INVALID_CREDENTIALS");
      return;
    }

    if (!user.emailVerified) {
      jsonApiError(res, 403, "AUTH_EMAIL_NOT_VERIFIED");
      return;
    }

    const normalizedLanguage = normalizeLanguage(language);

    let finalUser = user;

    if (user.language !== normalizedLanguage) {
      const [updatedUser] = await db
        .update(users)
        .set({ language: normalizedLanguage })
        .where(eq(users.id, user.id))
        .returning();

      if (updatedUser) {
        finalUser = updatedUser;
      }
    }

    const token = signToken(finalUser.id, finalUser.email);

    res.json({
      token,
      user: mapUser(finalUser, 0),
    });
  } catch (err) {
    console.error("Login error:", err);
    jsonApiError(res, 500, "AUTH_LOGIN_FAILED");
  }
});

router.post("/resend-verification", async (req: Request, res: Response) => {
  try {
    const raw = (req.body as { email?: unknown }).email;
    if (typeof raw !== "string" || raw.trim() === "") {
      jsonApiError(res, 400, "AUTH_RESEND_VERIFICATION_EMAIL_MISSING");
      return;
    }

    const normalizedEmail = normalizeEmail(raw);

    const row = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!row || row.emailVerified) {
      res.json({
        success: true,
        message: RESEND_VERIFICATION_GENERIC_MESSAGE,
      });
      return;
    }

    if (isWithinVerificationResendCooldown(row.emailVerificationSentAt)) {
      res.json({
        success: true,
        message: RESEND_VERIFICATION_GENERIC_MESSAGE,
      });
      return;
    }

    const newToken = randomUUID();
    const sentAt = new Date();

    await db
      .update(users)
      .set({
        emailVerificationToken: newToken,
        emailVerificationSentAt: sentAt,
      })
      .where(eq(users.id, row.id));

    try {
      await sendVerificationEmail(row.email, newToken, row.name);
    } catch (mailErr) {
      console.error("sendVerificationEmail (resend-verification):", mailErr);
    }

    res.json({
      success: true,
      message: RESEND_VERIFICATION_GENERIC_MESSAGE,
    });
  } catch (err) {
    console.error("resend-verification error:", err);
    const pg =
      typeof err === "object" && err !== null
        ? (err as { code?: string })
        : {};
    if (pg.code === "42703" || pg.code === "42P01") {
      jsonApiError(res, 500, "DATABASE_SCHEMA_OUTDATED");
      return;
    }
    jsonApiError(res, 500, "AUTH_RESEND_VERIFICATION_FAILED");
  }
});

router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const raw = (req.body as { token?: unknown }).token;
    if (typeof raw !== "string" || raw.trim() === "") {
      jsonApiError(res, 400, "AUTH_VERIFY_TOKEN_MISSING");
      return;
    }

    const token = raw.trim();

    const row = await db.query.users.findFirst({
      where: eq(users.emailVerificationToken, token),
    });

    if (!row) {
      jsonApiError(res, 400, "AUTH_VERIFY_TOKEN_INVALID");
      return;
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
      })
      .where(eq(users.id, row.id));

    res.json(withApiSuccess({ success: true }, "EMAIL_VERIFIED"));
  } catch (err) {
    console.error("verify-email error:", err);
    jsonApiError(res, 500, "AUTH_VERIFY_FAILED");
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.user!;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      jsonApiError(res, 404, "USER_NOT_FOUND");
      return;
    }

    res.json({ user: mapUser(user, 0) });
  } catch (err) {
    console.error("Me error:", err);
    jsonApiError(res, 500, "PROFILE_LOAD_FAILED");
  }
});

export default router;
