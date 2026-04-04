import { Router, Response } from "express";
import { db, routeTemplates, type NewRouteTemplate, eq } from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

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
      res.status(401).json({ error: "Unauthorized" });
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
      res.status(400).json({
        error:
          "Missing required fields: name, origin, destination, availableSeats, price, currency, tripType",
      });
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
      res.status(400).json({
        error:
          "Valid coordinates are required for origin and destination (originLat, originLng, destinationLat, destinationLng)",
      });
      return;
    }

    const seatsNumber = Number(availableSeats);
    const priceNumber = Number(price);

    if (Number.isNaN(seatsNumber) || seatsNumber < 1) {
      res.status(400).json({ error: "availableSeats must be at least 1" });
      return;
    }

    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      res.status(400).json({ error: "price must be a positive number or 0" });
      return;
    }

    if (!["EUR", "USD", "PLN"].includes(currency)) {
      res.status(400).json({ error: "currency must be EUR, USD, or PLN" });
      return;
    }

    if (!["one-time", "regular"].includes(tripType)) {
      res.status(400).json({ error: "tripType must be one-time or regular" });
      return;
    }

    let weekdaysValue: string[] | null = null;

    if (tripType === "regular") {
      if (!Array.isArray(weekdays)) {
        res.status(400).json({
          error: "weekdays must be an array for regular templates",
        });
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
        res.status(400).json({
          error:
            "regular templates must have at least one weekday (mon, tue, wed, thu, fri, sat, sun)",
        });
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

    res.status(201).json({ template });
  } catch (err) {
    console.error("Create template error:", err);
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
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
    res.status(500).json({ error: "Failed to load templates" });
  }
});

async function handleDeleteTemplate(req: AuthRequest, res: Response) {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const templateId = String(req.params.id || "").trim();

    if (!templateId) {
      res.status(400).json({ error: "Template id is required" });
      return;
    }

    const existingTemplate = await db.query.routeTemplates.findFirst({
      where: (routeTemplatesTable, { eq }) =>
        eq(routeTemplatesTable.id, templateId),
    });

    if (!existingTemplate) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    if (existingTemplate.userId !== user.userId) {
      res.status(403).json({
        error: "You do not have permission to delete this template",
      });
      return;
    }

    await db.delete(routeTemplates).where(eq(routeTemplates.id, templateId));

    res.json({ success: true });
  } catch (err) {
    console.error("Delete template error:", err);
    res.status(500).json({ error: "Failed to delete template" });
  }
}

router.delete("/:id", authMiddleware, handleDeleteTemplate);
router.post("/:id/delete", authMiddleware, handleDeleteTemplate);

export default router;
