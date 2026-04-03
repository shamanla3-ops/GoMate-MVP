import { Router, Response } from "express";
import { db, tripRequests, trips, users, eq, and, or, desc } from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import {
  sendNewRequestNotification,
  sendRequestAcceptedNotification,
  sendRequestRejectedNotification,
  sendRequestCancelledByPassengerNotification,
} from "../lib/notifications.js";

const router: Router = Router();

function mapIncomingRequest(
  request: typeof tripRequests.$inferSelect,
  trip: typeof trips.$inferSelect,
  passenger: typeof users.$inferSelect
) {
  return {
    id: request.id,
    tripId: request.tripId,
    passengerId: request.passengerId,
    seatsRequested: request.seatsRequested,
    status: request.status,
    createdAt: request.createdAt,
    trip: {
      id: trip.id,
      origin: trip.origin,
      destination: trip.destination,
      departureTime: trip.departureTime,
      seatsTotal: trip.seatsTotal,
      availableSeats: trip.availableSeats,
      price: trip.price,
      currency: trip.currency,
      tripType: trip.tripType,
      weekdays: trip.weekdays,
      status: trip.status,
    },
    passenger: {
      id: passenger.id,
      name: passenger.name,
      avatarUrl: passenger.avatarUrl,
      rating: passenger.rating,
      phoneNumber: passenger.phoneNumber,
      age: passenger.age,
    },
  };
}

function mapOutgoingRequest(
  request: typeof tripRequests.$inferSelect,
  trip: typeof trips.$inferSelect,
  driver: typeof users.$inferSelect
) {
  return {
    id: request.id,
    tripId: request.tripId,
    passengerId: request.passengerId,
    seatsRequested: request.seatsRequested,
    status: request.status,
    createdAt: request.createdAt,
    trip: {
      id: trip.id,
      origin: trip.origin,
      destination: trip.destination,
      departureTime: trip.departureTime,
      seatsTotal: trip.seatsTotal,
      availableSeats: trip.availableSeats,
      price: trip.price,
      currency: trip.currency,
      tripType: trip.tripType,
      weekdays: trip.weekdays,
      status: trip.status,
    },
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
    },
  };
}

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { tripId, seatsRequested } = req.body as {
      tripId?: string;
      seatsRequested?: number;
    };

    if (!tripId) {
      res.status(400).json({ error: "tripId is required" });
      return;
    }

    const requestedSeats = Number(seatsRequested);

    if (!Number.isInteger(requestedSeats) || requestedSeats < 1) {
      res.status(400).json({ error: "seatsRequested must be at least 1" });
      return;
    }

    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
    });

    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    if (trip.driverId === user.userId) {
      res.status(400).json({ error: "You cannot join your own trip" });
      return;
    }

    if (trip.status !== "scheduled") {
      res.status(400).json({ error: "This trip is not available anymore" });
      return;
    }

    if (requestedSeats > trip.availableSeats) {
      res.status(400).json({ error: "Not enough free seats" });
      return;
    }

    const existingRequest = await db.query.tripRequests.findFirst({
      where: and(
        eq(tripRequests.tripId, tripId),
        eq(tripRequests.passengerId, user.userId),
        or(
          eq(tripRequests.status, "pending"),
          eq(tripRequests.status, "accepted")
        )
      ),
    });

    if (existingRequest) {
      res.status(409).json({
        error: "You already have an active request for this trip",
      });
      return;
    }

    const [request] = await db
      .insert(tripRequests)
      .values({
        tripId,
        passengerId: user.userId,
        seatsRequested: requestedSeats,
        status: "pending",
      })
      .returning();

    const passenger = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });

    if (passenger) {
      await sendNewRequestNotification(
        trip.driverId,
        passenger.name,
        trip.origin,
        trip.destination
      );
    }

    res.status(201).json({
      message: "Request sent to the driver",
      request,
    });
  } catch (err) {
    console.error("Create trip request error:", err);
    res.status(500).json({ error: "Failed to create trip request" });
  }
});

router.get("/incoming", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const rows = await db
      .select({
        request: tripRequests,
        trip: trips,
        passenger: users,
      })
      .from(tripRequests)
      .innerJoin(trips, eq(tripRequests.tripId, trips.id))
      .innerJoin(users, eq(tripRequests.passengerId, users.id))
      .where(eq(trips.driverId, user.userId))
      .orderBy(desc(tripRequests.createdAt));

    res.json({
      requests: rows.map((row) =>
        mapIncomingRequest(row.request, row.trip, row.passenger)
      ),
    });
  } catch (err) {
    console.error("Load incoming requests error:", err);
    res.status(500).json({ error: "Failed to load incoming requests" });
  }
});

router.get("/outgoing", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const rows = await db
      .select({
        request: tripRequests,
        trip: trips,
        driver: users,
      })
      .from(tripRequests)
      .innerJoin(trips, eq(tripRequests.tripId, trips.id))
      .innerJoin(users, eq(trips.driverId, users.id))
      .where(eq(tripRequests.passengerId, user.userId))
      .orderBy(desc(tripRequests.createdAt));

    res.json({
      requests: rows.map((row) =>
        mapOutgoingRequest(row.request, row.trip, row.driver)
      ),
    });
  } catch (err) {
    console.error("Load outgoing requests error:", err);
    res.status(500).json({ error: "Failed to load outgoing requests" });
  }
});

router.patch("/:id/accept", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const requestId = String(req.params.id || "").trim();

    if (!requestId) {
      res.status(400).json({ error: "Request id is required" });
      return;
    }

    const rows = await db
      .select({
        request: tripRequests,
        trip: trips,
      })
      .from(tripRequests)
      .innerJoin(trips, eq(tripRequests.tripId, trips.id))
      .where(eq(tripRequests.id, requestId));

    const row = rows[0];

    if (!row) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    if (row.trip.driverId !== user.userId) {
      res.status(403).json({ error: "You cannot manage this request" });
      return;
    }

    if (row.request.status !== "pending") {
      res.status(400).json({ error: "Only pending requests can be accepted" });
      return;
    }

    if (row.request.seatsRequested > row.trip.availableSeats) {
      res.status(400).json({ error: "Not enough free seats anymore" });
      return;
    }

    const [updatedRequest] = await db
      .update(tripRequests)
      .set({ status: "accepted" })
      .where(eq(tripRequests.id, requestId))
      .returning();

    const [updatedTrip] = await db
      .update(trips)
      .set({
        availableSeats: row.trip.availableSeats - row.request.seatsRequested,
      })
      .where(eq(trips.id, row.trip.id))
      .returning();

    const driver = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });

    if (driver) {
      await sendRequestAcceptedNotification(
        row.request.passengerId,
        driver.name,
        row.trip.origin,
        row.trip.destination
      );
    }

    res.json({
      message: "Request accepted",
      request: updatedRequest,
      trip: updatedTrip,
    });
  } catch (err) {
    console.error("Accept trip request error:", err);
    res.status(500).json({ error: "Failed to accept trip request" });
  }
});

router.patch("/:id/reject", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const requestId = String(req.params.id || "").trim();

    if (!requestId) {
      res.status(400).json({ error: "Request id is required" });
      return;
    }

    const rows = await db
      .select({
        request: tripRequests,
        trip: trips,
      })
      .from(tripRequests)
      .innerJoin(trips, eq(tripRequests.tripId, trips.id))
      .where(eq(tripRequests.id, requestId));

    const row = rows[0];

    if (!row) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    if (row.trip.driverId !== user.userId) {
      res.status(403).json({ error: "You cannot manage this request" });
      return;
    }

    if (row.request.status !== "pending") {
      res.status(400).json({ error: "Only pending requests can be rejected" });
      return;
    }

    const [updatedRequest] = await db
      .update(tripRequests)
      .set({ status: "rejected" })
      .where(eq(tripRequests.id, requestId))
      .returning();

    const driver = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });

    if (driver) {
      await sendRequestRejectedNotification(
        row.request.passengerId,
        driver.name,
        row.trip.origin,
        row.trip.destination
      );
    }

    res.json({
      message: "Request rejected",
      request: updatedRequest,
    });
  } catch (err) {
    console.error("Reject trip request error:", err);
    res.status(500).json({ error: "Failed to reject trip request" });
  }
});

router.patch("/:id/cancel", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const requestId = String(req.params.id || "").trim();

    if (!requestId) {
      res.status(400).json({ error: "Request id is required" });
      return;
    }

    const rows = await db
      .select({
        request: tripRequests,
        trip: trips,
      })
      .from(tripRequests)
      .innerJoin(trips, eq(tripRequests.tripId, trips.id))
      .where(eq(tripRequests.id, requestId));

    const row = rows[0];

    if (!row) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    if (row.request.passengerId !== user.userId) {
      res.status(403).json({ error: "You can cancel only your own request" });
      return;
    }

    if (row.request.status !== "pending" && row.request.status !== "accepted") {
      res.status(400).json({
        error: "Only pending or accepted requests can be cancelled",
      });
      return;
    }

    const [updatedRequest] = await db
      .update(tripRequests)
      .set({
        status: "cancelled_by_passenger",
      })
      .where(eq(tripRequests.id, requestId))
      .returning();

    let updatedTrip: typeof trips.$inferSelect | null = null;

    if (row.request.status === "accepted") {
      const restoredSeats = Math.min(
        row.trip.seatsTotal,
        row.trip.availableSeats + row.request.seatsRequested
      );

      const [tripAfterRestore] = await db
        .update(trips)
        .set({
          availableSeats: restoredSeats,
        })
        .where(eq(trips.id, row.trip.id))
        .returning();

      updatedTrip = tripAfterRestore;
    }

    const passenger = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });

    if (passenger) {
      await sendRequestCancelledByPassengerNotification(
        row.trip.driverId,
        passenger.name,
        row.trip.origin,
        row.trip.destination
      );
    }

    res.json({
      message:
        row.request.status === "accepted"
          ? "Participation cancelled"
          : "Request cancelled",
      request: updatedRequest,
      trip: updatedTrip,
    });
  } catch (err) {
    console.error("Cancel trip request error:", err);
    res.status(500).json({ error: "Failed to cancel trip request" });
  }
});

export default router;