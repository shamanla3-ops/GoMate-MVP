import { Router, Response } from "express";
import {
  db,
  tripChats,
  tripMessages,
  trips,
  users,
  eq,
  and,
  desc,
  asc,
} from "@gomate/db";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

const router: Router = Router();

type SafeChatDetails = {
  id: string;
  tripId: string;
  driverId: string;
  passengerId: string;
  driverLastReadAt: Date | null;
  passengerLastReadAt: Date | null;
  createdAt: Date;
  trip: {
    id: string;
    origin: string;
    destination: string;
    departureTime: Date;
    status: string;
  } | null;
  driver: {
    id: string;
    name: string;
    avatarUrl: string | null;
    rating: number | null;
    phoneNumber: string | null;
  } | null;
  passenger: {
    id: string;
    name: string;
    avatarUrl: string | null;
    rating: number | null;
    phoneNumber: string | null;
  } | null;
};

function getReadAtForUser(
  chat: typeof tripChats.$inferSelect,
  userId: string
): Date | null {
  if (chat.driverId === userId) {
    return chat.driverLastReadAt ?? null;
  }

  if (chat.passengerId === userId) {
    return chat.passengerLastReadAt ?? null;
  }

  return null;
}

async function loadChatDetails(chatId: string): Promise<SafeChatDetails | null> {
  const chat = await db.query.tripChats.findFirst({
    where: eq(tripChats.id, chatId),
  });

  if (!chat) {
    return null;
  }

  const [trip, driver, passenger] = await Promise.all([
    db.query.trips.findFirst({
      where: eq(trips.id, chat.tripId),
    }),
    db.query.users.findFirst({
      where: eq(users.id, chat.driverId),
    }),
    db.query.users.findFirst({
      where: eq(users.id, chat.passengerId),
    }),
  ]);

  return {
    id: chat.id,
    tripId: chat.tripId,
    driverId: chat.driverId,
    passengerId: chat.passengerId,
    driverLastReadAt: chat.driverLastReadAt ?? null,
    passengerLastReadAt: chat.passengerLastReadAt ?? null,
    createdAt: chat.createdAt,
    trip: trip
      ? {
          id: trip.id,
          origin: trip.origin,
          destination: trip.destination,
          departureTime: trip.departureTime,
          status: trip.status,
        }
      : null,
    driver: driver
      ? {
          id: driver.id,
          name: driver.name,
          avatarUrl: driver.avatarUrl,
          rating: driver.rating,
          phoneNumber: driver.phoneNumber,
        }
      : null,
    passenger: passenger
      ? {
          id: passenger.id,
          name: passenger.name,
          avatarUrl: passenger.avatarUrl,
          rating: passenger.rating,
          phoneNumber: passenger.phoneNumber,
        }
      : null,
  };
}

async function canUserAccessChat(chatId: string, userId: string) {
  const chat = await db.query.tripChats.findFirst({
    where: eq(tripChats.id, chatId),
  });

  if (!chat) {
    return null;
  }

  if (chat.driverId !== userId && chat.passengerId !== userId) {
    return null;
  }

  return chat;
}

router.post("/by-trip/:tripId", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const tripId = String(req.params.tripId || "").trim();

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!tripId) {
      res.status(400).json({ error: "Trip id is required" });
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
      res.status(400).json({ error: "Driver cannot create chat with self" });
      return;
    }

    const existingChat = await db.query.tripChats.findFirst({
      where: and(
        eq(tripChats.tripId, tripId),
        eq(tripChats.passengerId, user.userId)
      ),
    });

    if (existingChat) {
      res.json({ chat: existingChat });
      return;
    }

    const now = new Date();

    const [createdChat] = await db
      .insert(tripChats)
      .values({
        tripId,
        driverId: trip.driverId,
        passengerId: user.userId,
        driverLastReadAt: now,
        passengerLastReadAt: now,
      })
      .returning();

    res.status(201).json({ chat: createdChat });
  } catch (err) {
    console.error("Create or get chat by trip error:", err);
    res.status(500).json({ error: "Failed to create or open chat" });
  }
});

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const allChats = await db.query.tripChats.findMany({
      orderBy: [desc(tripChats.createdAt)],
    });

    const userChats = allChats.filter(
      (chat) => chat.driverId === user.userId || chat.passengerId === user.userId
    );

    const result = await Promise.all(
      userChats.map(async (chat) => {
        const [trip, driver, passenger, chatMessages] = await Promise.all([
          db.query.trips.findFirst({
            where: eq(trips.id, chat.tripId),
          }),
          db.query.users.findFirst({
            where: eq(users.id, chat.driverId),
          }),
          db.query.users.findFirst({
            where: eq(users.id, chat.passengerId),
          }),
          db.query.tripMessages.findMany({
            where: eq(tripMessages.chatId, chat.id),
            orderBy: [asc(tripMessages.createdAt)],
          }),
        ]);

        const lastMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
        const readAt = getReadAtForUser(chat, user.userId);

        const unreadCount = chatMessages.filter((msg) => {
          if (msg.senderId === user.userId) {
            return false;
          }

          if (!readAt) {
            return true;
          }

          return new Date(msg.createdAt).getTime() > new Date(readAt).getTime();
        }).length;

        return {
          id: chat.id,
          tripId: chat.tripId,
          driverId: chat.driverId,
          passengerId: chat.passengerId,
          driverLastReadAt: chat.driverLastReadAt ?? null,
          passengerLastReadAt: chat.passengerLastReadAt ?? null,
          createdAt: chat.createdAt,
          unreadCount,
          trip: trip
            ? {
                id: trip.id,
                origin: trip.origin,
                destination: trip.destination,
                departureTime: trip.departureTime,
                status: trip.status,
              }
            : null,
          driver: driver
            ? {
                id: driver.id,
                name: driver.name,
                avatarUrl: driver.avatarUrl,
                rating: driver.rating,
                phoneNumber: driver.phoneNumber,
              }
            : null,
          passenger: passenger
            ? {
                id: passenger.id,
                name: passenger.name,
                avatarUrl: passenger.avatarUrl,
                rating: passenger.rating,
                phoneNumber: passenger.phoneNumber,
              }
            : null,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                chatId: lastMessage.chatId,
                senderId: lastMessage.senderId,
                text: lastMessage.text,
                createdAt: lastMessage.createdAt,
              }
            : null,
        };
      })
    );

    const totalUnread = result.reduce((sum, chat) => sum + chat.unreadCount, 0);

    res.json({
      chats: result,
      totalUnread,
    });
  } catch (err) {
    console.error("Load chats error:", err);
    res.status(500).json({ error: "Failed to load chats" });
  }
});

router.get("/:chatId/messages", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const chatId = String(req.params.chatId || "").trim();

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!chatId) {
      res.status(400).json({ error: "Chat id is required" });
      return;
    }

    const accessChat = await canUserAccessChat(chatId, user.userId);

    if (!accessChat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    const fullChat = await loadChatDetails(chatId);

    if (!fullChat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    const rows = await db
      .select({
        message: tripMessages,
        sender: users,
      })
      .from(tripMessages)
      .innerJoin(users, eq(tripMessages.senderId, users.id))
      .where(eq(tripMessages.chatId, chatId))
      .orderBy(asc(tripMessages.createdAt));

    res.json({
      chat: fullChat,
      messages: rows.map((row) => ({
        id: row.message.id,
        chatId: row.message.chatId,
        senderId: row.message.senderId,
        text: row.message.text,
        createdAt: row.message.createdAt,
        sender: {
          id: row.sender.id,
          name: row.sender.name,
          avatarUrl: row.sender.avatarUrl,
        },
      })),
    });
  } catch (err) {
    console.error("Load chat messages error:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

router.post("/:chatId/messages", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const chatId = String(req.params.chatId || "").trim();
    const text = String(req.body?.text || "").trim();

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!chatId) {
      res.status(400).json({ error: "Chat id is required" });
      return;
    }

    if (!text) {
      res.status(400).json({ error: "Text is required" });
      return;
    }

    const chat = await canUserAccessChat(chatId, user.userId);

    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    const [createdMessage] = await db
      .insert(tripMessages)
      .values({
        chatId,
        senderId: user.userId,
        text,
      })
      .returning();

    const now = new Date();

    if (chat.driverId === user.userId) {
      await db
        .update(tripChats)
        .set({
          driverLastReadAt: now,
        })
        .where(eq(tripChats.id, chatId));
    } else {
      await db
        .update(tripChats)
        .set({
          passengerLastReadAt: now,
        })
        .where(eq(tripChats.id, chatId));
    }

    const sender = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });

    res.status(201).json({
      message: {
        id: createdMessage.id,
        chatId: createdMessage.chatId,
        senderId: createdMessage.senderId,
        text: createdMessage.text,
        createdAt: createdMessage.createdAt,
        sender: sender
          ? {
              id: sender.id,
              name: sender.name,
              avatarUrl: sender.avatarUrl,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

router.patch("/:chatId/read", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const chatId = String(req.params.chatId || "").trim();

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!chatId) {
      res.status(400).json({ error: "Chat id is required" });
      return;
    }

    const chat = await canUserAccessChat(chatId, user.userId);

    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    const now = new Date();

    if (chat.driverId === user.userId) {
      await db
        .update(tripChats)
        .set({
          driverLastReadAt: now,
        })
        .where(eq(tripChats.id, chatId));
    } else {
      await db
        .update(tripChats)
        .set({
          passengerLastReadAt: now,
        })
        .where(eq(tripChats.id, chatId));
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Mark chat as read error:", err);
    res.status(500).json({ error: "Failed to mark chat as read" });
  }
});

export default router;