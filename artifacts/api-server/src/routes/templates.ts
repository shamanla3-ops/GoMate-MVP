import { Router, Response } from "express";
import { db, routeTemplates, type NewRouteTemplate, eq } from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { jsonApiError } from "../lib/apiErrors.js";
import { withApiSuccess } from "../lib/apiSuccess.js";

const router: Router = Router();

const VALID_WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isValidLat(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

function isValidLng(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const {
      name,
      origin,
      destination,
      defaultDepartureTime,
      availableSeats,
      price,
      currency,
      tripType,
      weekdays,
      originLat,
      originLng,
      destinationLat,
      destinationLng,
    } = req.body as {
      name?: string;
      origin?: string;
      destination?: string;
      defaultDepartureTime?: string | null;
      availableSeats?: number;
      price?: number;
      currency?: "EUR" | "USD" | "PLN";
      tripType?: "one-time" | "regular";
      weekdays?: string[];
      originLat?: unknown;
      originLng?: unknown;
      destinationLat?: unknown;
      destinationLng?: unknown;
    };

    if (
      !name ||
      !origin ||
      !destination ||
      availableSeats === undefined ||
      price === undefined ||
      !currency ||
      !tripType
    ) {
      jsonApiError(res, 400, "TEMPLATE_FIELDS_MISSING");
      return;
    }

    const oLat = parseCoordinate(originLat);
    const oLng = parseCoordinate(originLng);
    const dLat = parseCoordinate(destinationLat);
    const dLng = parseCoordinate(destinationLng);

    if (
      oLat === null ||
      oLng === null ||
      dLat === null ||
      dLng === null ||
      !isValidLat(oLat) ||
      !isValidLng(oLng) ||
      !isValidLat(dLat) ||
      !isValidLng(dLng)
    ) {
      jsonApiError(res, 400, "TEMPLATE_COORDINATES_INVALID");
      return;
    }

    const seatsNumber = Number(availableSeats);
    const priceNumber = Number(price);

    if (Number.isNaN(seatsNumber) || seatsNumber < 1) {
      jsonApiError(res, 400, "TEMPLATE_SEATS_INVALID");
      return;
    }

    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      jsonApiError(res, 400, "TEMPLATE_PRICE_INVALID");
      return;
    }

    if (!["EUR", "USD", "PLN"].includes(currency)) {
      jsonApiError(res, 400, "TEMPLATE_CURRENCY_INVALID");
      return;
    }

    if (!["one-time", "regular"].includes(tripType)) {
      jsonApiError(res, 400, "TEMPLATE_TYPE_INVALID");
      return;
    }

    let weekdaysValue: string[] | null = null;

    if (tripType === "regular") {
      if (!Array.isArray(weekdays)) {
        jsonApiError(res, 400, "TEMPLATE_WEEKDAYS_ARRAY_REQUIRED");
        return;
      }

      const normalizedWeekdays = [
        ...new Set(
          weekdays
            .map((day) => String(day).toLowerCase())
            .filter((day) => VALID_WEEKDAYS.includes(day))
        ),
      ];

      if (normalizedWeekdays.length === 0) {
        jsonApiError(res, 400, "TEMPLATE_WEEKDAYS_EMPTY");
        return;
      }

      weekdaysValue = normalizedWeekdays;
    }

    const insertValues = {
      userId: user.userId,
      name: name.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      originLat: oLat,
      originLng: oLng,
      destinationLat: dLat,
      destinationLng: dLng,
      defaultDepartureTime:
        defaultDepartureTime && defaultDepartureTime.trim()
          ? defaultDepartureTime.trim()
          : null,
      availableSeats: seatsNumber,
      price: Math.round(priceNumber),
      currency,
      tripType,
      weekdays: weekdaysValue,
    } as NewRouteTemplate;

    const [template] = await db
      .insert(routeTemplates)
      .values(insertValues)
      .returning();

    res.status(201).json(withApiSuccess({ template }, "TEMPLATE_CREATED"));
  } catch (err) {
    console.error("Create template error:", err);
    jsonApiError(res, 500, "TEMPLATE_CREATE_FAILED");
  }
});

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const templates = await db.query.routeTemplates.findMany({
      where: (routeTemplatesTable, { eq }) =>
        eq(routeTemplatesTable.userId, user.userId),
      orderBy: (routeTemplatesTable, { desc }) => [
        desc(routeTemplatesTable.createdAt),
      ],
    });

    res.json({ templates });
  } catch (err) {
    console.error("Load templates error:", err);
    jsonApiError(res, 500, "TEMPLATE_LIST_FAILED");
  }
});

async function handleDeleteTemplate(req: AuthRequest, res: Response) {
  try {
    const user = req.user;

    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const templateId = String(req.params.id || "").trim();

    if (!templateId) {
      jsonApiError(res, 400, "TEMPLATE_ID_REQUIRED");
      return;
    }

    const existingTemplate = await db.query.routeTemplates.findFirst({
      where: (routeTemplatesTable, { eq }) =>
        eq(routeTemplatesTable.id, templateId),
    });

    if (!existingTemplate) {
      jsonApiError(res, 404, "TEMPLATE_NOT_FOUND");
      return;
    }

    if (existingTemplate.userId !== user.userId) {
      jsonApiError(res, 403, "TEMPLATE_DELETE_FORBIDDEN");
      return;
    }

    await db.delete(routeTemplates).where(eq(routeTemplates.id, templateId));

    res.json(withApiSuccess({ success: true }, "TEMPLATE_DELETED"));
  } catch (err) {
    console.error("Delete template error:", err);
    jsonApiError(res, 500, "TEMPLATE_DELETE_FAILED");
  }
}

router.delete("/:id", authMiddleware, handleDeleteTemplate);
router.post("/:id/delete", authMiddleware, handleDeleteTemplate);

export default router;
