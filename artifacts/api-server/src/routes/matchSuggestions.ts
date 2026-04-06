import { Router, Response } from "express";
import { and, db, eq, matchSuggestionDismissals } from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { jsonApiError } from "../lib/apiErrors.js";
import { withApiSuccess } from "../lib/apiSuccess.js";
import {
  deleteMatchSuggestionState,
  markMatchSuggestionsSeen,
  syncMatchSuggestionsWithState,
} from "../lib/matchSuggestionSync.js";
import { getMatchSuggestionPollSnapshot } from "../lib/matchSuggestionPoll.js";

const router: Router = Router();

/** Lightweight: badge + one-shot poll keys (no full matching recomputation). */
router.get("/count", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }
    const { newMatchCount, matchNewNotifiedKeys } =
      await getMatchSuggestionPollSnapshot(user.userId);
    res.json(
      withApiSuccess(
        { newMatchCount, matchNewNotifiedKeys },
        "MATCH_SUGGESTIONS_POLL"
      )
    );
  } catch {
    jsonApiError(res, 500, "MATCH_SUGGESTIONS_FAILED");
  }
});

/** Recompute + upsert state rows (used on Smart Matches page load and periodic client reconcile). */
router.post("/reconcile", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }
    const { newMatchCount, newNotifiedKeys } = await syncMatchSuggestionsWithState(
      user.userId
    );
    res.json(
      withApiSuccess(
        { ok: true, newMatchCount, newNotifiedKeys },
        "MATCH_SUGGESTIONS_RECONCILED"
      )
    );
  } catch {
    jsonApiError(res, 500, "MATCH_SUGGESTIONS_FAILED");
  }
});

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }
    const { suggestions, newNotifiedKeys, newMatchCount } =
      await syncMatchSuggestionsWithState(user.userId);
    res.json(
      withApiSuccess(
        { suggestions, newMatchCount, newNotifiedKeys },
        "MATCH_SUGGESTIONS_LISTED"
      )
    );
  } catch {
    jsonApiError(res, 500, "MATCH_SUGGESTIONS_FAILED");
  }
});

router.post("/seen", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const body = req.body as {
      suggestionKeys?: unknown;
      markAll?: unknown;
    };

    const markAll = body.markAll === true;
    if (markAll) {
      const sync = await syncMatchSuggestionsWithState(user.userId);
      await markMatchSuggestionsSeen(
        user.userId,
        sync.suggestions.map((s) => s.id)
      );
      res.json(withApiSuccess({ ok: true }, "MATCH_SUGGESTIONS_SEEN"));
      return;
    }

    const raw = body.suggestionKeys;
    if (!Array.isArray(raw) || raw.some((k) => typeof k !== "string")) {
      jsonApiError(res, 400, "MATCH_SEEN_KEYS_INVALID");
      return;
    }
    const keys = raw as string[];
    if (keys.length === 0) {
      jsonApiError(res, 400, "MATCH_SEEN_KEYS_EMPTY");
      return;
    }
    await markMatchSuggestionsSeen(user.userId, keys);
    res.json(withApiSuccess({ ok: true }, "MATCH_SUGGESTIONS_SEEN"));
  } catch {
    jsonApiError(res, 500, "MATCH_SEEN_FAILED");
  }
});

router.post("/dismiss", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const body = req.body as {
      targetType?: string;
      targetId?: string;
    };

    const targetType = body.targetType;
    const targetId = body.targetId;

    if (
      targetType !== "trip" &&
      targetType !== "template" &&
      targetType !== "preference"
    ) {
      jsonApiError(res, 400, "MATCH_DISMISS_TYPE_INVALID");
      return;
    }
    if (!targetId || typeof targetId !== "string") {
      jsonApiError(res, 400, "MATCH_DISMISS_ID_REQUIRED");
      return;
    }

    const dup = await db
      .select({ id: matchSuggestionDismissals.id })
      .from(matchSuggestionDismissals)
      .where(
        and(
          eq(matchSuggestionDismissals.userId, user.userId),
          eq(matchSuggestionDismissals.targetType, targetType),
          eq(matchSuggestionDismissals.targetId, targetId)
        )
      )
      .limit(1);

    if (!dup.length) {
      await db.insert(matchSuggestionDismissals).values({
        userId: user.userId,
        targetType,
        targetId,
      });
    }

    const suggestionKey =
      targetType === "trip"
        ? `trip:${targetId}`
        : targetType === "template"
          ? `template:${targetId}`
          : `preference:${targetId}`;
    await deleteMatchSuggestionState(user.userId, suggestionKey);

    res.json(withApiSuccess({ ok: true }, "MATCH_SUGGESTION_DISMISSED"));
  } catch {
    jsonApiError(res, 500, "MATCH_DISMISS_FAILED");
  }
});

export default router;
