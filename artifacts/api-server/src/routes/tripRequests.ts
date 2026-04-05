import { Router, Response } from "express";
import { db, tripRequests, trips, users, eq, and, or, desc } from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import {
  sendNewRequestNotification,
  sendRequestAcceptedNotification,
  sendRequestRejectedNotification,
  sendRequestCancelledByPassengerNotification,
} from "../lib/notifications.js";
import { jsonApiError } from "../lib/apiErrors.js";
import { withApiSuccess } from "../lib/apiSuccess.js";

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
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const { tripId, seatsRequested } = req.body as {
      tripId?: string;
      seatsRequested?: number;
    };

    if (!tripId) {
      jsonApiError(res, 400, "REQUEST_TRIP_ID_REQUIRED");
      return;
    }

    const requestedSeats = Number(seatsRequested);

    if (!Number.isInteger(requestedSeats) || requestedSeats < 1) {
      jsonApiError(res, 400, "REQUEST_SEATS_INVALID");
      return;
    }

    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
    });

    if (!trip) {
      jsonApiError(res, 404, "TRIP_NOT_FOUND");
      return;
    }

    if (trip.driverId === user.userId) {
      jsonApiError(res, 400, "REQUEST_OWN_TRIP_FORBIDDEN");
      return;
    }

    if (trip.status !== "scheduled") {
      jsonApiError(res, 400, "TRIP_NOT_AVAILABLE");
      return;
    }

    if (requestedSeats > trip.availableSeats) {
      jsonApiError(res, 400, "TRIP_SEATS_NOT_ENOUGH");
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
      jsonApiError(res, 409, "REQUEST_DUPLICATE_ACTIVE");
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

    res.status(201).json(withApiSuccess({ request }, "REQUEST_SENT"));
  } catch (err) {
    console.error("Create trip request error:", err);
    jsonApiError(res, 500, "REQUEST_CREATE_FAILED");
  }
});

router.get("/incoming", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
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
    jsonApiError(res, 500, "REQUEST_INCOMING_LOAD_FAILED");
  }
});

router.get("/outgoing", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
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
    jsonApiError(res, 500, "REQUEST_OUTGOING_LOAD_FAILED");
  }
});

router.patch("/:id/accept", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const requestId = String(req.params.id || "").trim();

    if (!requestId) {
      jsonApiError(res, 400, "REQUEST_ID_REQUIRED");
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
      jsonApiError(res, 404, "REQUEST_NOT_FOUND");
      return;
    }

    if (row.trip.driverId !== user.userId) {
      jsonApiError(res, 403, "REQUEST_MANAGE_FORBIDDEN");
      return;
    }

    if (row.request.status !== "pending") {
      jsonApiError(res, 400, "REQUEST_ACCEPT_NOT_PENDING");
      return;
    }

    if (row.request.seatsRequested > row.trip.availableSeats) {
      jsonApiError(res, 400, "TRIP_SEATS_NOT_ENOUGH_ACCEPT");
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

    res.json(
      withApiSuccess(
        { request: updatedRequest, trip: updatedTrip },
        "REQUEST_ACCEPTED"
      )
    );
  } catch (err) {
    console.error("Accept trip request error:", err);
    jsonApiError(res, 500, "REQUEST_ACCEPT_FAILED");
  }
});

router.patch("/:id/reject", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const requestId = String(req.params.id || "").trim();

    if (!requestId) {
      jsonApiError(res, 400, "REQUEST_ID_REQUIRED");
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
      jsonApiError(res, 404, "REQUEST_NOT_FOUND");
      return;
    }

    if (row.trip.driverId !== user.userId) {
      jsonApiError(res, 403, "REQUEST_MANAGE_FORBIDDEN");
      return;
    }

    if (row.request.status !== "pending") {
      jsonApiError(res, 400, "REQUEST_REJECT_NOT_PENDING");
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

    res.json(withApiSuccess({ request: updatedRequest }, "REQUEST_REJECTED"));
  } catch (err) {
    console.error("Reject trip request error:", err);
    jsonApiError(res, 500, "REQUEST_REJECT_FAILED");
  }
});

router.patch("/:id/cancel", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const requestId = String(req.params.id || "").trim();

    if (!requestId) {
      jsonApiError(res, 400, "REQUEST_ID_REQUIRED");
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
      jsonApiError(res, 404, "REQUEST_NOT_FOUND");
      return;
    }

    if (row.request.passengerId !== user.userId) {
      jsonApiError(res, 403, "REQUEST_CANCEL_FORBIDDEN");
      return;
    }

    if (row.request.status !== "pending" && row.request.status !== "accepted") {
      jsonApiError(res, 400, "REQUEST_CANCEL_INVALID_STATE");
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

    const cancelCode =
      row.request.status === "accepted"
        ? "REQUEST_PARTICIPATION_CANCELLED"
        : "REQUEST_CANCELLED";
    res.json(
      withApiSuccess(
        { request: updatedRequest, trip: updatedTrip },
        cancelCode
      )
    );
  } catch (err) {
    console.error("Cancel trip request error:", err);
    jsonApiError(res, 500, "REQUEST_CANCEL_FAILED");
  }
});

export default router;