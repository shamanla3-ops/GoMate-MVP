import { createHash } from "node:crypto";
import { Router, Response } from "express";
import {
  db,
  users,
  trips,
  routeTemplates,
  permanentPassengerRequests,
  permanentPassengerRelationships,
  permanentPassengerSkips,
  eq,
  and,
  or,
  desc,
  inArray,
} from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { jsonApiError } from "../lib/apiErrors.js";
import { withApiSuccess } from "../lib/apiSuccess.js";

const router: Router = Router();

const VALID_WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const NOTE_MAX = 2000;
const PREFERRED_TIME_MAX = 50;

function normalizeWeekdays(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const filtered = [
    ...new Set(
      raw
        .map((d) => String(d).toLowerCase().trim())
        .filter((d) => VALID_WEEKDAYS.includes(d as (typeof VALID_WEEKDAYS)[number]))
    ),
  ];
  if (filtered.length === 0) return null;
  const order = [...VALID_WEEKDAYS] as readonly string[];
  filtered.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return filtered;
}

function buildPatternKey(input: {
  driverId: string;
  passengerId: string;
  weekdays: string[];
  templateId: string | null;
  preferredTime: string | null;
  originText: string | null;
  destinationText: string | null;
}): string {
  const w = input.weekdays.join(",");
  const payload = [
    input.driverId,
    input.passengerId,
    w,
    input.templateId ?? "",
    input.preferredTime ?? "",
    input.originText ?? "",
    input.destinationText ?? "",
  ].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

function recipientUserIdForRequest(
  row: typeof permanentPassengerRequests.$inferSelect
): string {
  if (row.direction === "request") {
    return row.driverId;
  }
  return row.passengerId;
}

function mapPublicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl,
    rating: u.rating,
    phoneNumber: u.phoneNumber,
    age: u.age,
    carBrand: u.carBrand,
    carModel: u.carModel,
    carColor: u.carColor,
    carPlateNumber: u.carPlateNumber,
  };
}

async function loadUsersByIds(ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map<string, typeof users.$inferSelect>();
  const rows = await db.select().from(users).where(inArray(users.id, unique));
  const map = new Map<string, typeof users.$inferSelect>();
  for (const u of rows) {
    map.set(u.id, u);
  }
  return map;
}

function mapRequestResponse(
  row: typeof permanentPassengerRequests.$inferSelect,
  userMap: Map<string, typeof users.$inferSelect>
) {
  const driver = userMap.get(row.driverId);
  const passenger = userMap.get(row.passengerId);
  const creator = userMap.get(row.requestedByUserId);
  return {
    id: row.id,
    driverId: row.driverId,
    passengerId: row.passengerId,
    requestedByUserId: row.requestedByUserId,
    direction: row.direction,
    templateId: row.templateId,
    tripId: row.tripId,
    originText: row.originText,
    destinationText: row.destinationText,
    preferredTime: row.preferredTime,
    weekdays: row.weekdays,
    note: row.note,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    respondedAt: row.respondedAt,
    driver: driver ? mapPublicUser(driver) : null,
    passenger: passenger ? mapPublicUser(passenger) : null,
    creator: creator ? mapPublicUser(creator) : null,
  };
}

function mapRelationshipResponse(
  row: typeof permanentPassengerRelationships.$inferSelect,
  userMap: Map<string, typeof users.$inferSelect>
) {
  const driver = userMap.get(row.driverId);
  const passenger = userMap.get(row.passengerId);
  return {
    id: row.id,
    driverId: row.driverId,
    passengerId: row.passengerId,
    sourceRequestId: row.sourceRequestId,
    templateId: row.templateId,
    preferredTime: row.preferredTime,
    weekdays: row.weekdays,
    originText: row.originText,
    destinationText: row.destinationText,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    endedAt: row.endedAt,
    driver: driver ? mapPublicUser(driver) : null,
    passenger: passenger ? mapPublicUser(passenger) : null,
  };
}

function todayUtcYmd(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(value: string): string | null {
  const s = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, mo, d] = s.split("-").map((x) => Number(x));
  if (!y || !mo || !d) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return s;
}

router.post("/requests", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const body = req.body as {
      direction?: string;
      targetUserId?: string;
      weekdays?: unknown;
      preferredTime?: string;
      note?: string;
      templateId?: string | null;
      tripId?: string | null;
    };

    const direction = String(body.direction || "").trim();
    if (direction !== "request" && direction !== "invitation") {
      jsonApiError(res, 400, "PP_DIRECTION_INVALID");
      return;
    }

    const targetUserId = String(body.targetUserId || "").trim();
    if (!targetUserId) {
      jsonApiError(res, 400, "PP_TARGET_USER_REQUIRED");
      return;
    }

    if (targetUserId === user.userId) {
      jsonApiError(res, 400, "PP_SAME_USER_FORBIDDEN");
      return;
    }

    const weekdays = normalizeWeekdays(body.weekdays);
    if (!weekdays) {
      jsonApiError(res, 400, "PP_WEEKDAYS_INVALID");
      return;
    }

    const noteRaw = body.note != null ? String(body.note) : "";
    if (noteRaw.length > NOTE_MAX) {
      jsonApiError(res, 400, "PP_NOTE_TOO_LONG");
      return;
    }
    const note = noteRaw.trim() === "" ? null : noteRaw.trim();

    const preferredRaw =
      body.preferredTime != null ? String(body.preferredTime).trim() : "";
    if (preferredRaw.length > PREFERRED_TIME_MAX) {
      jsonApiError(res, 400, "PP_PREFERRED_TIME_INVALID");
      return;
    }
    const preferredTime = preferredRaw === "" ? null : preferredRaw;

    let driverId: string;
    let passengerId: string;

    if (direction === "request") {
      passengerId = user.userId;
      driverId = targetUserId;
    } else {
      driverId = user.userId;
      passengerId = targetUserId;
    }

    let templateId: string | null =
      body.templateId != null && String(body.templateId).trim() !== ""
        ? String(body.templateId).trim()
        : null;
    let tripId: string | null =
      body.tripId != null && String(body.tripId).trim() !== ""
        ? String(body.tripId).trim()
        : null;

    let originText: string | null = null;
    let destinationText: string | null = null;

    if (tripId) {
      const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
      });
      if (!trip) {
        jsonApiError(res, 404, "PP_TRIP_NOT_FOUND");
        return;
      }
      if (trip.driverId !== driverId) {
        jsonApiError(res, 400, "PP_TRIP_CONTEXT_INVALID");
        return;
      }
      originText = trip.origin;
      destinationText = trip.destination;
    }

    if (templateId) {
      const tpl = await db.query.routeTemplates.findFirst({
        where: eq(routeTemplates.id, templateId),
      });
      if (!tpl) {
        jsonApiError(res, 404, "PP_TEMPLATE_NOT_FOUND");
        return;
      }
      if (tpl.userId !== driverId) {
        jsonApiError(res, 403, "PP_TEMPLATE_FORBIDDEN");
        return;
      }
      if (!originText) originText = tpl.origin;
      if (!destinationText) destinationText = tpl.destination;
    }

    const patternKey = buildPatternKey({
      driverId,
      passengerId,
      weekdays,
      templateId,
      preferredTime,
      originText,
      destinationText,
    });

    const existingPending = await db.query.permanentPassengerRequests.findFirst({
      where: and(
        eq(permanentPassengerRequests.patternKey, patternKey),
        eq(permanentPassengerRequests.status, "pending")
      ),
    });
    if (existingPending) {
      jsonApiError(res, 409, "PP_DUPLICATE_PENDING");
      return;
    }

    const existingActive =
      await db.query.permanentPassengerRelationships.findFirst({
        where: and(
          eq(permanentPassengerRelationships.patternKey, patternKey),
          eq(permanentPassengerRelationships.status, "active")
        ),
      });
    if (existingActive) {
      jsonApiError(res, 409, "PP_ACTIVE_EXISTS");
      return;
    }

    const [inserted] = await db
      .insert(permanentPassengerRequests)
      .values({
        driverId,
        passengerId,
        requestedByUserId: user.userId,
        direction: direction as "request" | "invitation",
        templateId,
        tripId,
        originText,
        destinationText,
        preferredTime,
        weekdays,
        note,
        patternKey,
        status: "pending",
        updatedAt: new Date(),
      })
      .returning();

    if (!inserted) {
      jsonApiError(res, 500, "PP_CREATE_FAILED");
      return;
    }

    const userMap = await loadUsersByIds([
      inserted.driverId,
      inserted.passengerId,
      inserted.requestedByUserId,
    ]);

    res
      .status(201)
      .json(
        withApiSuccess(
          { request: mapRequestResponse(inserted, userMap) },
          "PP_REQUEST_CREATED"
        )
      );
  } catch (err) {
    console.error("Permanent passenger create request error:", err);
    jsonApiError(res, 500, "PP_CREATE_FAILED");
  }
});

router.get(
  "/requests/incoming",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        jsonApiError(res, 401, "UNAUTHORIZED");
        return;
      }

      const rows = await db
        .select()
        .from(permanentPassengerRequests)
        .where(
          and(
            eq(permanentPassengerRequests.status, "pending"),
            or(
              and(
                eq(permanentPassengerRequests.direction, "request"),
                eq(permanentPassengerRequests.driverId, user.userId)
              ),
              and(
                eq(permanentPassengerRequests.direction, "invitation"),
                eq(permanentPassengerRequests.passengerId, user.userId)
              )
            )
          )
        )
        .orderBy(desc(permanentPassengerRequests.createdAt));

      const ids: string[] = [];
      for (const r of rows) {
        ids.push(r.driverId, r.passengerId, r.requestedByUserId);
      }
      const userMap = await loadUsersByIds(ids);

      res.json({
        requests: rows.map((r) => mapRequestResponse(r, userMap)),
      });
    } catch (err) {
      console.error("Permanent passenger incoming error:", err);
      jsonApiError(res, 500, "PP_LOAD_INCOMING_FAILED");
    }
  }
);

router.get(
  "/requests/outgoing",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        jsonApiError(res, 401, "UNAUTHORIZED");
        return;
      }

      const rows = await db
        .select()
        .from(permanentPassengerRequests)
        .where(eq(permanentPassengerRequests.requestedByUserId, user.userId))
        .orderBy(desc(permanentPassengerRequests.createdAt));

      const ids: string[] = [];
      for (const r of rows) {
        ids.push(r.driverId, r.passengerId, r.requestedByUserId);
      }
      const userMap = await loadUsersByIds(ids);

      res.json({
        requests: rows.map((r) => mapRequestResponse(r, userMap)),
      });
    } catch (err) {
      console.error("Permanent passenger outgoing error:", err);
      jsonApiError(res, 500, "PP_LOAD_OUTGOING_FAILED");
    }
  }
);

router.post(
  "/requests/:id/accept",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        jsonApiError(res, 401, "UNAUTHORIZED");
        return;
      }

      const id = String(req.params.id || "").trim();
      if (!id) {
        jsonApiError(res, 400, "PP_REQUEST_ID_REQUIRED");
        return;
      }

      const row = await db.query.permanentPassengerRequests.findFirst({
        where: eq(permanentPassengerRequests.id, id),
      });

      if (!row) {
        jsonApiError(res, 404, "PP_REQUEST_NOT_FOUND");
        return;
      }

      if (row.driverId !== user.userId && row.passengerId !== user.userId) {
        jsonApiError(res, 403, "PP_NOT_PARTICIPANT");
        return;
      }

      const recipient = recipientUserIdForRequest(row);
      if (recipient !== user.userId) {
        jsonApiError(res, 403, "PP_ACCEPT_FORBIDDEN");
        return;
      }

      if (row.status !== "pending") {
        jsonApiError(res, 400, "PP_NOT_PENDING");
        return;
      }

      const activeDup =
        await db.query.permanentPassengerRelationships.findFirst({
          where: and(
            eq(permanentPassengerRelationships.patternKey, row.patternKey),
            eq(permanentPassengerRelationships.status, "active")
          ),
        });
      if (activeDup) {
        jsonApiError(res, 409, "PP_ACTIVE_EXISTS");
        return;
      }

      const now = new Date();

      const relRows = await db.transaction(async (tx) => {
        await tx
          .update(permanentPassengerRequests)
          .set({
            status: "accepted",
            respondedAt: now,
            updatedAt: now,
          })
          .where(eq(permanentPassengerRequests.id, id));

        return tx
          .insert(permanentPassengerRelationships)
          .values({
            driverId: row.driverId,
            passengerId: row.passengerId,
            sourceRequestId: row.id,
            templateId: row.templateId,
            preferredTime: row.preferredTime,
            weekdays: row.weekdays,
            patternKey: row.patternKey,
            originText: row.originText,
            destinationText: row.destinationText,
            status: "active",
            updatedAt: now,
          })
          .returning();
      });

      const rel = relRows[0];

      res.json(
        withApiSuccess(
          { relationshipId: rel?.id ?? null },
          "PP_REQUEST_ACCEPTED"
        )
      );
    } catch (err) {
      console.error("Permanent passenger accept error:", err);
      jsonApiError(res, 500, "PP_ACCEPT_FAILED");
    }
  }
);

router.post(
  "/requests/:id/reject",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        jsonApiError(res, 401, "UNAUTHORIZED");
        return;
      }

      const id = String(req.params.id || "").trim();
      if (!id) {
        jsonApiError(res, 400, "PP_REQUEST_ID_REQUIRED");
        return;
      }

      const row = await db.query.permanentPassengerRequests.findFirst({
        where: eq(permanentPassengerRequests.id, id),
      });

      if (!row) {
        jsonApiError(res, 404, "PP_REQUEST_NOT_FOUND");
        return;
      }

      if (row.driverId !== user.userId && row.passengerId !== user.userId) {
        jsonApiError(res, 403, "PP_NOT_PARTICIPANT");
        return;
      }

      const recipient = recipientUserIdForRequest(row);
      if (recipient !== user.userId) {
        jsonApiError(res, 403, "PP_REJECT_FORBIDDEN");
        return;
      }

      if (row.status !== "pending") {
        jsonApiError(res, 400, "PP_NOT_PENDING");
        return;
      }

      const now = new Date();
      await db
        .update(permanentPassengerRequests)
        .set({
          status: "rejected",
          respondedAt: now,
          updatedAt: now,
        })
        .where(eq(permanentPassengerRequests.id, id));

      res.json(withApiSuccess({ success: true }, "PP_REQUEST_REJECTED"));
    } catch (err) {
      console.error("Permanent passenger reject error:", err);
      jsonApiError(res, 500, "PP_REJECT_FAILED");
    }
  }
);

router.post(
  "/requests/:id/cancel",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        jsonApiError(res, 401, "UNAUTHORIZED");
        return;
      }

      const id = String(req.params.id || "").trim();
      if (!id) {
        jsonApiError(res, 400, "PP_REQUEST_ID_REQUIRED");
        return;
      }

      const row = await db.query.permanentPassengerRequests.findFirst({
        where: eq(permanentPassengerRequests.id, id),
      });

      if (!row) {
        jsonApiError(res, 404, "PP_REQUEST_NOT_FOUND");
        return;
      }

      if (row.requestedByUserId !== user.userId) {
        jsonApiError(res, 403, "PP_CANCEL_FORBIDDEN");
        return;
      }

      if (row.status !== "pending") {
        jsonApiError(res, 400, "PP_NOT_PENDING");
        return;
      }

      const now = new Date();
      await db
        .update(permanentPassengerRequests)
        .set({
          status: "cancelled",
          respondedAt: now,
          updatedAt: now,
        })
        .where(eq(permanentPassengerRequests.id, id));

      res.json(withApiSuccess({ success: true }, "PP_REQUEST_CANCELLED"));
    } catch (err) {
      console.error("Permanent passenger cancel error:", err);
      jsonApiError(res, 500, "PP_CANCEL_FAILED");
    }
  }
);

router.get("/relationships", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const rows = await db
      .select()
      .from(permanentPassengerRelationships)
      .where(
        and(
          eq(permanentPassengerRelationships.status, "active"),
          or(
            eq(permanentPassengerRelationships.driverId, user.userId),
            eq(permanentPassengerRelationships.passengerId, user.userId)
          )
        )
      )
      .orderBy(desc(permanentPassengerRelationships.createdAt));

    const ids: string[] = [];
    for (const r of rows) {
      ids.push(r.driverId, r.passengerId);
    }
    const userMap = await loadUsersByIds(ids);

    const asDriver = rows
      .filter((r) => r.driverId === user.userId)
      .map((r) => mapRelationshipResponse(r, userMap));
    const asPassenger = rows
      .filter((r) => r.passengerId === user.userId)
      .map((r) => mapRelationshipResponse(r, userMap));

    res.json({ asDriver, asPassenger });
  } catch (err) {
    console.error("Permanent passenger relationships error:", err);
    jsonApiError(res, 500, "PP_LOAD_RELATIONSHIPS_FAILED");
  }
});

router.post(
  "/relationships/:id/end",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        jsonApiError(res, 401, "UNAUTHORIZED");
        return;
      }

      const id = String(req.params.id || "").trim();
      if (!id) {
        jsonApiError(res, 400, "PP_RELATIONSHIP_ID_REQUIRED");
        return;
      }

      const row = await db.query.permanentPassengerRelationships.findFirst({
        where: eq(permanentPassengerRelationships.id, id),
      });

      if (!row) {
        jsonApiError(res, 404, "PP_RELATIONSHIP_NOT_FOUND");
        return;
      }

      if (row.driverId !== user.userId && row.passengerId !== user.userId) {
        jsonApiError(res, 403, "PP_END_FORBIDDEN");
        return;
      }

      if (row.status !== "active") {
        jsonApiError(res, 400, "PP_REL_NOT_ACTIVE");
        return;
      }

      const now = new Date();
      await db
        .update(permanentPassengerRelationships)
        .set({
          status: "inactive",
          endedAt: now,
          updatedAt: now,
        })
        .where(eq(permanentPassengerRelationships.id, id));

      res.json(withApiSuccess({ success: true }, "PP_RELATIONSHIP_ENDED"));
    } catch (err) {
      console.error("Permanent passenger end relationship error:", err);
      jsonApiError(res, 500, "PP_END_FAILED");
    }
  }
);

router.post(
  "/relationships/:id/skip",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        jsonApiError(res, 401, "UNAUTHORIZED");
        return;
      }

      const id = String(req.params.id || "").trim();
      if (!id) {
        jsonApiError(res, 400, "PP_RELATIONSHIP_ID_REQUIRED");
        return;
      }

      const body = req.body as { date?: string };
      const rawDate = body.date;
      if (rawDate === undefined || rawDate === null || String(rawDate).trim() === "") {
        jsonApiError(res, 400, "PP_SKIP_DATE_REQUIRED");
        return;
      }

      const ymd = parseYmd(String(rawDate));
      if (!ymd) {
        jsonApiError(res, 400, "PP_SKIP_DATE_INVALID");
        return;
      }

      const today = todayUtcYmd();
      if (ymd < today) {
        jsonApiError(res, 400, "PP_SKIP_PAST_FORBIDDEN");
        return;
      }

      const row = await db.query.permanentPassengerRelationships.findFirst({
        where: eq(permanentPassengerRelationships.id, id),
      });

      if (!row) {
        jsonApiError(res, 404, "PP_RELATIONSHIP_NOT_FOUND");
        return;
      }

      if (row.driverId !== user.userId && row.passengerId !== user.userId) {
        jsonApiError(res, 403, "PP_SKIP_FORBIDDEN");
        return;
      }

      if (row.status !== "active") {
        jsonApiError(res, 400, "PP_REL_NOT_ACTIVE");
        return;
      }

      try {
        await db.insert(permanentPassengerSkips).values({
          relationshipId: id,
          skipDate: ymd,
          createdByUserId: user.userId,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("duplicate") || msg.includes("unique")) {
          jsonApiError(res, 409, "PP_SKIP_DUPLICATE");
          return;
        }
        throw e;
      }

      res.json(withApiSuccess({ success: true, date: ymd }, "PP_SKIP_REGISTERED"));
    } catch (err) {
      console.error("Permanent passenger skip error:", err);
      jsonApiError(res, 500, "PP_SKIP_FAILED");
    }
  }
);

router.get(
  "/relationships/:id/skips",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        jsonApiError(res, 401, "UNAUTHORIZED");
        return;
      }

      const id = String(req.params.id || "").trim();
      if (!id) {
        jsonApiError(res, 400, "PP_RELATIONSHIP_ID_REQUIRED");
        return;
      }

      const row = await db.query.permanentPassengerRelationships.findFirst({
        where: eq(permanentPassengerRelationships.id, id),
      });

      if (!row) {
        jsonApiError(res, 404, "PP_RELATIONSHIP_NOT_FOUND");
        return;
      }

      if (row.driverId !== user.userId && row.passengerId !== user.userId) {
        jsonApiError(res, 403, "PP_NOT_PARTICIPANT");
        return;
      }

      const skips = await db
        .select()
        .from(permanentPassengerSkips)
        .where(eq(permanentPassengerSkips.relationshipId, id))
        .orderBy(desc(permanentPassengerSkips.skipDate));

      res.json({ skips });
    } catch (err) {
      console.error("Permanent passenger list skips error:", err);
      jsonApiError(res, 500, "PP_LOAD_SKIPS_FAILED");
    }
  }
);

router.get(
  "/trip/:tripId/context",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        jsonApiError(res, 401, "UNAUTHORIZED");
        return;
      }

      const tripId = String(req.params.tripId || "").trim();
      if (!tripId) {
        jsonApiError(res, 400, "TRIP_ID_REQUIRED");
        return;
      }

      const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
      });

      if (!trip) {
        jsonApiError(res, 404, "TRIP_NOT_FOUND");
        return;
      }

      const driverId = trip.driverId;
      const me = user.userId;
      const isDriverView = me === driverId;

      let relationshipForPair:
        | typeof permanentPassengerRelationships.$inferSelect
        | null = null;
      let driverPassengerCount: number | null = null;

      if (isDriverView) {
        const activeForDriver = await db
          .select()
          .from(permanentPassengerRelationships)
          .where(
            and(
              eq(permanentPassengerRelationships.status, "active"),
              eq(permanentPassengerRelationships.driverId, driverId)
            )
          );
        driverPassengerCount = activeForDriver.length;
      } else {
        const pairRows = await db
          .select()
          .from(permanentPassengerRelationships)
          .where(
            and(
              eq(permanentPassengerRelationships.status, "active"),
              eq(permanentPassengerRelationships.driverId, driverId),
              eq(permanentPassengerRelationships.passengerId, me)
            )
          )
          .orderBy(desc(permanentPassengerRelationships.createdAt))
          .limit(1);
        relationshipForPair = pairRows[0] ?? null;
      }

      const today = todayUtcYmd();
      let skippingToday = false;
      if (relationshipForPair) {
        const sk = await db.query.permanentPassengerSkips.findFirst({
          where: and(
            eq(permanentPassengerSkips.relationshipId, relationshipForPair.id),
            eq(permanentPassengerSkips.skipDate, today)
          ),
        });
        skippingToday = Boolean(sk);
      }

      res.json({
        tripId: trip.id,
        driverId: trip.driverId,
        viewerRole: isDriverView ? "driver" : "passenger",
        activeRelationshipWithDriver: relationshipForPair
          ? {
              id: relationshipForPair.id,
              weekdays: relationshipForPair.weekdays,
              preferredTime: relationshipForPair.preferredTime,
              originText: relationshipForPair.originText,
              destinationText: relationshipForPair.destinationText,
              skippingToday,
            }
          : null,
        driverPermanentPassengerCount: driverPassengerCount,
        seatMessageHint:
          relationshipForPair && !skippingToday
            ? "permanent_passenger_priority_hint"
            : relationshipForPair && skippingToday
              ? "permanent_passenger_skipping_hint"
              : null,
      });
    } catch (err) {
      console.error("Permanent passenger trip context error:", err);
      jsonApiError(res, 500, "PP_TRIP_CONTEXT_LOAD_FAILED");
    }
  }
);

export default router;
