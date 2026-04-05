import { Router, Request, Response } from "express";
import {
  db,
  trips,
  users,
  tripRequests,
  type NewTrip,
  eq,
  and,
  or,
  desc,
} from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { resolveDrivingDurationMinutes } from "../lib/osrmDuration.js";
import { jsonApiError } from "../lib/apiErrors.js";
import { withApiSuccess } from "../lib/apiSuccess.js";

const router: Router = Router();

const VALID_WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function estimateCo2SavingKg(seatsTotal: number): number {
  const safeSeats = Math.max(1, seatsTotal);
  return 6 + (safeSeats - 1) * 2;
}

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

function mapTripWithDriver(
  trip: typeof trips.$inferSelect,
  driver: typeof users.$inferSelect
) {
  return {
    id: trip.id,
    driverId: trip.driverId,
    origin: trip.origin,
    destination: trip.destination,
    originLabel: trip.origin,
    destinationLabel: trip.destination,
    originLat: trip.originLat ?? null,
    originLng: trip.originLng ?? null,
    destinationLat: trip.destinationLat ?? null,
    destinationLng: trip.destinationLng ?? null,
    departureTime: trip.departureTime,
    seatsTotal: trip.seatsTotal,
    availableSeats: trip.availableSeats,
    price: trip.price,
    currency: trip.currency,
    tripType: trip.tripType,
    weekdays: trip.weekdays,
    status: trip.status,
    createdAt: trip.createdAt,
    estimatedDurationMinutes: trip.estimatedDurationMinutes ?? null,
    expectedEndTime: trip.expectedEndTime ?? null,
    completedAt: trip.completedAt ?? null,
    completionMode: trip.completionMode ?? null,
    estimatedCo2SavingKg: estimateCo2SavingKg(trip.seatsTotal),
    driver: {
      id: driver.id,
      name: driver.name,
      avatarUrl: driver.avatarUrl,
      rating: driver.rating,
      phoneNumber: driver.phoneNumber,
      age: driver.age,
      carBrand: driver.carBrand,
      carModel: driver.carModel,
      carColor: driver.carColor,
      carPlateNumber: driver.carPlateNumber,
      co2SavedKg: driver.co2SavedKg,
    },
  };
}

async function loadTripsWithDrivers() {
  const rows = await db
    .select({
      trip: trips,
      driver: users,
    })
    .from(trips)
    .innerJoin(users, eq(trips.driverId, users.id))
    .where(eq(trips.status, "scheduled"))
    .orderBy(desc(trips.createdAt));

  return rows.map((row) => mapTripWithDriver(row.trip, row.driver));
}

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const {
      origin,
      destination,
      departureTime,
      seatsTotal,
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
      origin?: string;
      destination?: string;
      departureTime?: string;
      seatsTotal?: number;
      availableSeats?: number;
      price?: number;
      currency?: "EUR" | "USD" | "PLN";
      tripType?: "one-time" | "regular";
      weekdays?: string[];
      originLat?: unknown;
      originLng?: unknown;
      destinationLat?: unknown;
      destinationLng?: unknown;
      estimatedDurationMinutes?: unknown;
    };

    if (
      !origin ||
      !destination ||
      !departureTime ||
      price === undefined ||
      !currency ||
      !tripType
    ) {
      jsonApiError(res, 400, "TRIP_CREATE_FIELDS_MISSING");
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
      jsonApiError(res, 400, "TRIP_COORDINATES_INVALID");
      return;
    }

    const rawSeats = seatsTotal ?? availableSeats;
    const seatsNumber = Number(rawSeats);
    const priceNumber = Number(price);
    const departureDate = new Date(departureTime);

    if (rawSeats === undefined || Number.isNaN(seatsNumber) || seatsNumber < 1) {
      jsonApiError(res, 400, "TRIP_SEATS_INVALID");
      return;
    }

    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      jsonApiError(res, 400, "TRIP_PRICE_INVALID");
      return;
    }

    if (!["EUR", "USD", "PLN"].includes(currency)) {
      jsonApiError(res, 400, "TRIP_CURRENCY_INVALID");
      return;
    }

    if (!["one-time", "regular"].includes(tripType)) {
      jsonApiError(res, 400, "TRIP_TYPE_INVALID");
      return;
    }

    if (Number.isNaN(departureDate.getTime())) {
      jsonApiError(res, 400, "TRIP_DEPARTURE_INVALID");
      return;
    }

    let weekdaysValue: string[] | null = null;

    if (tripType === "regular") {
      if (!Array.isArray(weekdays)) {
        jsonApiError(res, 400, "TRIP_WEEKDAYS_ARRAY_REQUIRED");
        return;
      }

      const filtered = [
        ...new Set(
          weekdays
            .map((d) => String(d).toLowerCase())
            .filter((d) => VALID_WEEKDAYS.includes(d as (typeof VALID_WEEKDAYS)[number]))
        ),
      ];

      if (filtered.length === 0) {
        jsonApiError(res, 400, "TRIP_WEEKDAYS_EMPTY");
        return;
      }

      weekdaysValue = filtered;
    }

    const serverDurationMinutes = await resolveDrivingDurationMinutes(
      oLat,
      oLng,
      dLat,
      dLng
    );

    const clientRaw = (req.body as { estimatedDurationMinutes?: unknown })
      .estimatedDurationMinutes;
    let durationMinutes = serverDurationMinutes;
    if (typeof clientRaw === "number" && Number.isFinite(clientRaw)) {
      const c = Math.round(clientRaw);
      if (c >= 5 && c <= 48 * 60 && serverDurationMinutes > 0) {
        const ratio = c / serverDurationMinutes;
        if (ratio >= 0.65 && ratio <= 1.35) {
          durationMinutes = c;
        }
      }
    }

    const expectedEndTime = new Date(
      departureDate.getTime() + durationMinutes * 60 * 1000
    );

    const insertValues: NewTrip = {
      driverId: user.userId,
      origin: origin.trim(),
      destination: destination.trim(),
      originLat: oLat,
      originLng: oLng,
      destinationLat: dLat,
      destinationLng: dLng,
      departureTime: departureDate,
      seatsTotal: seatsNumber,
      availableSeats: seatsNumber,
      price: Math.round(priceNumber),
      currency,
      tripType,
      weekdays: weekdaysValue,
      status: "scheduled",
      estimatedDurationMinutes: durationMinutes,
      expectedEndTime,
    };

    const [trip] = await db.insert(trips).values(insertValues).returning();

    const driver = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });

    if (!driver) {
      jsonApiError(res, 500, "TRIP_DRIVER_MISSING");
      return;
    }

    res
      .status(201)
      .json(
        withApiSuccess({ trip: mapTripWithDriver(trip, driver) }, "TRIP_CREATED")
      );
  } catch (err) {
    console.error("Create trip error:", err);
    const pg =
      typeof err === "object" && err !== null
        ? (err as { code?: string; message?: string })
        : {};
    const missingColumn =
      pg.code === "42703" ||
      (typeof pg.message === "string" &&
        (pg.message.includes("does not exist") ||
          pg.message.includes("column")));
    if (missingColumn) {
      jsonApiError(res, 500, "DATABASE_SCHEMA_OUTDATED_TRIPS");
    } else {
      jsonApiError(res, 500, "TRIP_CREATE_FAILED");
    }
  }
});

router.get("/search", async (req: Request, res: Response) => {
  try {
    const origin = String(req.query.origin ?? "").trim();
    const destination = String(req.query.destination ?? "").trim();

    if (!origin && !destination) {
      const allTrips = await loadTripsWithDrivers();
      res.json({ trips: allTrips });
      return;
    }

    const allTrips = await loadTripsWithDrivers();

    const filteredTrips = allTrips.filter((trip) => {
      const originOk = origin
        ? trip.origin.toLowerCase().includes(origin.toLowerCase())
        : true;
      const destinationOk = destination
        ? trip.destination.toLowerCase().includes(destination.toLowerCase())
        : true;

      return originOk && destinationOk;
    });

    res.json({ trips: filteredTrips });
  } catch (err) {
    console.error("Search trips error:", err);
    jsonApiError(res, 500, "TRIP_SEARCH_FAILED");
  }
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const allTrips = await loadTripsWithDrivers();
    res.json({ trips: allTrips });
  } catch (err) {
    console.error("Load trips error:", err);
    jsonApiError(res, 500, "TRIP_LIST_FAILED");
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const tripId = String(req.params.id || "").trim();

    if (!tripId) {
      jsonApiError(res, 400, "TRIP_ID_REQUIRED");
      return;
    }

    const rows = await db
      .select({
        trip: trips,
        driver: users,
      })
      .from(trips)
      .innerJoin(users, eq(trips.driverId, users.id))
      .where(eq(trips.id, tripId));

    const row = rows[0];

    if (!row) {
      jsonApiError(res, 404, "TRIP_NOT_FOUND");
      return;
    }

    res.json({ trip: mapTripWithDriver(row.trip, row.driver) });
  } catch (err) {
    console.error("Load trip details error:", err);
    jsonApiError(res, 500, "TRIP_DETAILS_FAILED");
  }
});

async function handleDeleteTrip(req: AuthRequest, res: Response) {
  try {
    const user = req.user;

    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const tripId = String(req.params.id || "").trim();

    if (!tripId) {
      jsonApiError(res, 400, "TRIP_ID_REQUIRED");
      return;
    }

    const existingTrip = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
    });

    if (!existingTrip) {
      jsonApiError(res, 404, "TRIP_NOT_FOUND");
      return;
    }

    if (existingTrip.driverId !== user.userId) {
      jsonApiError(res, 403, "TRIP_DELETE_FORBIDDEN");
      return;
    }

    if (existingTrip.status === "cancelled") {
      jsonApiError(res, 400, "TRIP_ALREADY_CANCELLED");
      return;
    }

    await db
      .update(trips)
      .set({
        status: "cancelled",
      })
      .where(eq(trips.id, tripId));

    await db
      .update(tripRequests)
      .set({
        status: "cancelled_by_driver",
      })
      .where(
        and(
          eq(tripRequests.tripId, tripId),
          or(
            eq(tripRequests.status, "pending"),
            eq(tripRequests.status, "accepted")
          )
        )
      );

    res.json(
      withApiSuccess({ success: true, deletedTripId: tripId }, "TRIP_DELETED")
    );
  } catch (err) {
    console.error("Delete trip error:", err);
    jsonApiError(res, 500, "TRIP_DELETE_FAILED");
  }
}

router.delete("/:id", authMiddleware, handleDeleteTrip);
router.post("/:id/delete", authMiddleware, handleDeleteTrip);

export default router;
