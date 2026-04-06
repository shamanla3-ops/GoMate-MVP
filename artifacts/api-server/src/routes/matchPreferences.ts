import { Router, Response } from "express";
import {
  and,
  db,
  eq,
  routeMatchPreferences,
  type NewRouteMatchPreference,
} from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { jsonApiError } from "../lib/apiErrors.js";
import { withApiSuccess } from "../lib/apiSuccess.js";
import {
  validateWeekdays,
  validateRole,
  parseTimeToMinutes,
} from "../lib/smartMatching.js";

const router: Router = Router();

function parseBody(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }
    const rows = await db
      .select()
      .from(routeMatchPreferences)
      .where(eq(routeMatchPreferences.userId, user.userId));
    res.json(withApiSuccess({ preferences: rows }, "MATCH_PREFERENCES_LISTED"));
  } catch {
    jsonApiError(res, 500, "MATCH_PREFERENCES_LIST_FAILED");
  }
});

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const b = parseBody(req.body);
    const roleStr = String(b.role);
    const originText = typeof b.originText === "string" ? b.originText : "";
    const destinationText =
      typeof b.destinationText === "string" ? b.destinationText : "";
    const preferredTime =
      typeof b.preferredTime === "string" ? b.preferredTime : "";
    const weekdays = Array.isArray(b.weekdays)
      ? (b.weekdays as unknown[]).map((x) => String(x))
      : [];
    const timeFlexMinutes =
      b.timeFlexMinutes === null || b.timeFlexMinutes === undefined
        ? null
        : Number(b.timeFlexMinutes);
    const notes = typeof b.notes === "string" ? b.notes : null;
    const templateId =
      typeof b.templateId === "string" ? b.templateId : null;

    if (!validateRole(roleStr)) {
      jsonApiError(res, 400, "MATCH_PREF_ROLE_INVALID");
      return;
    }
    if (!originText.trim() || !destinationText.trim()) {
      jsonApiError(res, 400, "MATCH_PREF_ORIGIN_DEST_REQUIRED");
      return;
    }
    if (!preferredTime.trim()) {
      jsonApiError(res, 400, "MATCH_PREF_TIME_REQUIRED");
      return;
    }
    if (parseTimeToMinutes(preferredTime) === null) {
      jsonApiError(res, 400, "MATCH_PREF_TIME_INVALID");
      return;
    }
    if (!validateWeekdays(weekdays)) {
      jsonApiError(res, 400, "MATCH_PREF_WEEKDAYS_INVALID");
      return;
    }
    if (
      timeFlexMinutes !== null &&
      (Number.isNaN(timeFlexMinutes) ||
        timeFlexMinutes < 0 ||
        timeFlexMinutes > 120)
    ) {
      jsonApiError(res, 400, "MATCH_PREF_FLEX_INVALID");
      return;
    }

    const insert: NewRouteMatchPreference = {
      userId: user.userId,
      role: roleStr,
      originText: originText.trim(),
      destinationText: destinationText.trim(),
      preferredTime: preferredTime.trim(),
      timeFlexMinutes,
      weekdays,
      isActive: true,
      templateId,
      notes,
    };

    const [created] = await db
      .insert(routeMatchPreferences)
      .values(insert)
      .returning();

    res.json(
      withApiSuccess({ preference: created }, "MATCH_PREFERENCE_CREATED")
    );
  } catch {
    jsonApiError(res, 500, "MATCH_PREFERENCE_CREATE_FAILED");
  }
});

router.patch("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }
    const id = req.params.id;
    if (!id) {
      jsonApiError(res, 400, "MATCH_PREF_ID_REQUIRED");
      return;
    }

    const existing = await db
      .select()
      .from(routeMatchPreferences)
      .where(
        and(
          eq(routeMatchPreferences.id, id),
          eq(routeMatchPreferences.userId, user.userId)
        )
      )
      .limit(1);

    if (!existing.length) {
      jsonApiError(res, 404, "MATCH_PREF_NOT_FOUND");
      return;
    }

    const b = parseBody(req.body);
    const patch: Partial<NewRouteMatchPreference> = {
      updatedAt: new Date(),
    };

    if (b.role !== undefined) {
      const patchRoleStr = String(b.role);
      if (!validateRole(patchRoleStr)) {
        jsonApiError(res, 400, "MATCH_PREF_ROLE_INVALID");
        return;
      }
      patch.role = patchRoleStr;
    }
    if (typeof b.originText === "string") patch.originText = b.originText.trim();
    if (typeof b.destinationText === "string")
      patch.destinationText = b.destinationText.trim();
    if (typeof b.preferredTime === "string") {
      if (parseTimeToMinutes(b.preferredTime) === null) {
        jsonApiError(res, 400, "MATCH_PREF_TIME_INVALID");
        return;
      }
      patch.preferredTime = b.preferredTime.trim();
    }
    if (Array.isArray(b.weekdays)) {
      const wd = (b.weekdays as unknown[]).map((x) => String(x));
      if (!validateWeekdays(wd)) {
        jsonApiError(res, 400, "MATCH_PREF_WEEKDAYS_INVALID");
        return;
      }
      patch.weekdays = wd;
    }
    if (b.timeFlexMinutes !== undefined) {
      const tf =
        b.timeFlexMinutes === null ? null : Number(b.timeFlexMinutes);
      if (
        tf !== null &&
        (Number.isNaN(tf) || tf < 0 || tf > 120)
      ) {
        jsonApiError(res, 400, "MATCH_PREF_FLEX_INVALID");
        return;
      }
      patch.timeFlexMinutes = tf;
    }
    if (typeof b.isActive === "boolean") patch.isActive = b.isActive;
    if (b.notes !== undefined) {
      patch.notes = typeof b.notes === "string" ? b.notes : null;
    }
    if (b.templateId !== undefined) {
      patch.templateId =
        typeof b.templateId === "string" ? b.templateId : null;
    }

    const [updated] = await db
      .update(routeMatchPreferences)
      .set(patch)
      .where(
        and(
          eq(routeMatchPreferences.id, id),
          eq(routeMatchPreferences.userId, user.userId)
        )
      )
      .returning();

    res.json(
      withApiSuccess({ preference: updated }, "MATCH_PREFERENCE_UPDATED")
    );
  } catch {
    jsonApiError(res, 500, "MATCH_PREFERENCE_UPDATE_FAILED");
  }
});

router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }
    const id = req.params.id;
    if (!id) {
      jsonApiError(res, 400, "MATCH_PREF_ID_REQUIRED");
      return;
    }

    const deleted = await db
      .delete(routeMatchPreferences)
      .where(
        and(
          eq(routeMatchPreferences.id, id),
          eq(routeMatchPreferences.userId, user.userId)
        )
      )
      .returning({ id: routeMatchPreferences.id });

    if (!deleted.length) {
      jsonApiError(res, 404, "MATCH_PREF_NOT_FOUND");
      return;
    }

    res.json(withApiSuccess({ ok: true }, "MATCH_PREFERENCE_DELETED"));
  } catch {
    jsonApiError(res, 500, "MATCH_PREFERENCE_DELETE_FAILED");
  }
});

export default router;
