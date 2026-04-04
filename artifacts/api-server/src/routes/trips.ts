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
      res.status(401).json({ error: "Unauthorized" });
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
    };

    if (
      !origin ||
      !destination ||
      !departureTime ||
      price === undefined ||
      !currency ||
      !tripType
    ) {
      res.status(400).json({
        error:
          "Missing required fields: origin, destination, departureTime, seatsTotal, price, currency, tripType",
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

    const rawSeats = seatsTotal ?? availableSeats;
    const seatsNumber = Number(rawSeats);
    const priceNumber = Number(price);
    const departureDate = new Date(departureTime);

    if (rawSeats === undefined || Number.isNaN(seatsNumber) || seatsNumber < 1) {
      res.status(400).json({ error: "seatsTotal must be at least 1" });
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

    if (Number.isNaN(departureDate.getTime())) {
      res.status(400).json({ error: "departureTime must be a valid date" });
      return;
    }

    let weekdaysValue: string[] | null = null;

    if (tripType === "regular") {
      if (!Array.isArray(weekdays)) {
        res.status(400).json({
          error: "weekdays must be an array for regular trips",
        });
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
        res.status(400).json({
          error:
            "regular trips must have at least one weekday (mon, tue, wed, thu, fri, sat, sun)",
        });
        return;
      }

      weekdaysValue = filtered;
    }

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
    };

    const [trip] = await db.insert(trips).values(insertValues).returning();

    const driver = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });

    if (!driver) {
      res.status(500).json({ error: "Driver not found after trip creation" });
      return;
    }

    res.status(201).json({ trip: mapTripWithDriver(trip, driver) });
  } catch (err) {
    console.error("Create trip error:", err);
    res.status(500).json({ error: "Failed to create trip" });
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
    res.status(500).json({ error: "Failed to search trips" });
  }
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const allTrips = await loadTripsWithDrivers();
    res.json({ trips: allTrips });
  } catch (err) {
    console.error("Load trips error:", err);
    res.status(500).json({ error: "Failed to load trips" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const tripId = String(req.params.id || "").trim();

    if (!tripId) {
      res.status(400).json({ error: "Trip id is required" });
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
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    res.json({ trip: mapTripWithDriver(row.trip, row.driver) });
  } catch (err) {
    console.error("Load trip details error:", err);
    res.status(500).json({ error: "Failed to load trip details" });
  }
});

async function handleDeleteTrip(req: AuthRequest, res: Response) {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tripId = String(req.params.id || "").trim();

    if (!tripId) {
      res.status(400).json({ error: "Trip id is required" });
      return;
    }

    const existingTrip = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
    });

    if (!existingTrip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    if (existingTrip.driverId !== user.userId) {
      res.status(403).json({
        error: "You do not have permission to delete this trip",
      });
      return;
    }

    if (existingTrip.status === "cancelled") {
      res.status(400).json({ error: "Trip is already cancelled" });
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

    res.json({
      success: true,
      deletedTripId: tripId,
    });
  } catch (err) {
    console.error("Delete trip error:", err);
    res.status(500).json({ error: "Failed to delete trip" });
  }
}

router.delete("/:id", authMiddleware, handleDeleteTrip);
router.post("/:id/delete", authMiddleware, handleDeleteTrip);

export default router;
