import {
  db,
  tripChats,
  tripMessages,
  tripRequests,
  trips,
  eq,
  and,
  desc,
  asc,
  count,
} from "@gomate/db";

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

export async function getNotificationCounts(userId: string): Promise<{
  chatsUnread: number;
  incomingPending: number;
  outgoingPending: number;
  requestsPending: number;
}> {
  const allChats = await db.query.tripChats.findMany({
    orderBy: [desc(tripChats.createdAt)],
  });

  const userChats = allChats.filter(
    (chat) => chat.driverId === userId || chat.passengerId === userId
  );

  let chatsUnread = 0;

  for (const chat of userChats) {
    const chatMessages = await db.query.tripMessages.findMany({
      where: eq(tripMessages.chatId, chat.id),
      orderBy: [asc(tripMessages.createdAt)],
    });

    const readAt = getReadAtForUser(chat, userId);

    const unreadCount = chatMessages.filter((msg) => {
      if (msg.senderId === userId) {
        return false;
      }

      if (!readAt) {
        return true;
      }

      return new Date(msg.createdAt).getTime() > new Date(readAt).getTime();
    }).length;

    chatsUnread += unreadCount;
  }

  const [incomingRow] = await db
    .select({ n: count() })
    .from(tripRequests)
    .innerJoin(trips, eq(tripRequests.tripId, trips.id))
    .where(and(eq(trips.driverId, userId), eq(tripRequests.status, "pending")));

  const [outgoingRow] = await db
    .select({ n: count() })
    .from(tripRequests)
    .where(
      and(eq(tripRequests.passengerId, userId), eq(tripRequests.status, "pending"))
    );

  const incomingPending = Number(incomingRow?.n ?? 0);
  const outgoingPending = Number(outgoingRow?.n ?? 0);

  return {
    chatsUnread,
    incomingPending,
    outgoingPending,
    requestsPending: incomingPending + outgoingPending,
  };
}
