import { db, users, eq } from "@gomate/db";
import { sendPushToUser } from "../routes/push.js";

type SupportedLanguage = "pl" | "en" | "de" | "ru" | "uk";

type PushPayload = {
  title: string;
  body: string;
  url: string;
};

function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  if (value === "pl" || value === "en" || value === "de" || value === "ru" || value === "uk") {
    return value;
  }

  return "pl";
}

const translations = {
  newRequest: {
    pl: (passengerName: string, origin: string, destination: string): PushPayload => ({
      title: "Nowa prośba o przejazd",
      body: `${passengerName} chce dołączyć do trasy ${origin} → ${destination}.`,
      url: "/requests",
    }),
    en: (passengerName: string, origin: string, destination: string): PushPayload => ({
      title: "New trip request",
      body: `${passengerName} wants to join the route ${origin} → ${destination}.`,
      url: "/requests",
    }),
    de: (passengerName: string, origin: string, destination: string): PushPayload => ({
      title: "Neue Mitfahranfrage",
      body: `${passengerName} möchte der Strecke ${origin} → ${destination} beitreten.`,
      url: "/requests",
    }),
    ru: (passengerName: string, origin: string, destination: string): PushPayload => ({
      title: "Новая заявка на поездку",
      body: `${passengerName} хочет присоединиться к маршруту ${origin} → ${destination}.`,
      url: "/requests",
    }),
    uk: (passengerName: string, origin: string, destination: string): PushPayload => ({
      title: "Нова заявка на поїздку",
      body: `${passengerName} хоче приєднатися до маршруту ${origin} → ${destination}.`,
      url: "/requests",
    }),
  },

  requestAccepted: {
    pl: (driverName: string, origin: string, destination: string): PushPayload => ({
      title: "Prośba zaakceptowana",
      body: `${driverName} zaakceptował Twoją prośbę na trasę ${origin} → ${destination}.`,
      url: "/my-requests",
    }),
    en: (driverName: string, origin: string, destination: string): PushPayload => ({
      title: "Request accepted",
      body: `${driverName} accepted your request for ${origin} → ${destination}.`,
      url: "/my-requests",
    }),
    de: (driverName: string, origin: string, destination: string): PushPayload => ({
      title: "Anfrage bestätigt",
      body: `${driverName} hat deine Anfrage für ${origin} → ${destination} bestätigt.`,
      url: "/my-requests",
    }),
    ru: (driverName: string, origin: string, destination: string): PushPayload => ({
      title: "Заявка подтверждена",
      body: `${driverName} подтвердил вашу заявку на маршрут ${origin} → ${destination}.`,
      url: "/my-requests",
    }),
    uk: (driverName: string, origin: string, destination: string): PushPayload => ({
      title: "Заявку підтверджено",
      body: `${driverName} підтвердив вашу заявку на маршрут ${origin} → ${destination}.`,
      url: "/my-requests",
    }),
  },

  requestRejected: {
    pl: (driverName: string, origin: string, destination: string): PushPayload => ({
      title: "Prośba odrzucona",
      body: `${driverName} odrzucił Twoją prośbę na trasę ${origin} → ${destination}.`,
      url: "/my-requests",
    }),
    en: (driverName: string, origin: string, destination: string): PushPayload => ({
      title: "Request rejected",
      body: `${driverName} rejected your request for ${origin} → ${destination}.`,
      url: "/my-requests",
    }),
    de: (driverName: string, origin: string, destination: string): PushPayload => ({
      title: "Anfrage abgelehnt",
      body: `${driverName} hat deine Anfrage für ${origin} → ${destination} abgelehnt.`,
      url: "/my-requests",
    }),
    ru: (driverName: string, origin: string, destination: string): PushPayload => ({
      title: "Заявка отклонена",
      body: `${driverName} отклонил вашу заявку на маршрут ${origin} → ${destination}.`,
      url: "/my-requests",
    }),
    uk: (driverName: string, origin: string, destination: string): PushPayload => ({
      title: "Заявку відхилено",
      body: `${driverName} відхилив вашу заявку на маршрут ${origin} → ${destination}.`,
      url: "/my-requests",
    }),
  },

  requestCancelledByPassenger: {
    pl: (passengerName: string, origin: string, destination: string): PushPayload => ({
      title: "Pasażer anulował prośbę",
      body: `${passengerName} anulował prośbę na trasę ${origin} → ${destination}.`,
      url: "/requests",
    }),
    en: (passengerName: string, origin: string, destination: string): PushPayload => ({
      title: "Passenger cancelled request",
      body: `${passengerName} cancelled the request for ${origin} → ${destination}.`,
      url: "/requests",
    }),
    de: (passengerName: string, origin: string, destination: string): PushPayload => ({
      title: "Fahrgast hat Anfrage storniert",
      body: `${passengerName} hat die Anfrage für ${origin} → ${destination} storniert.`,
      url: "/requests",
    }),
    ru: (passengerName: string, origin: string, destination: string): PushPayload => ({
      title: "Пассажир отменил заявку",
      body: `${passengerName} отменил заявку на маршрут ${origin} → ${destination}.`,
      url: "/requests",
    }),
    uk: (passengerName: string, origin: string, destination: string): PushPayload => ({
      title: "Пасажир скасував заявку",
      body: `${passengerName} скасував заявку на маршрут ${origin} → ${destination}.`,
      url: "/requests",
    }),
  },

  newChatMessage: {
    pl: (senderName: string, text: string): PushPayload => ({
      title: `Nowa wiadomość od ${senderName}`,
      body: text,
      url: "/chats",
    }),
    en: (senderName: string, text: string): PushPayload => ({
      title: `New message from ${senderName}`,
      body: text,
      url: "/chats",
    }),
    de: (senderName: string, text: string): PushPayload => ({
      title: `Neue Nachricht von ${senderName}`,
      body: text,
      url: "/chats",
    }),
    ru: (senderName: string, text: string): PushPayload => ({
      title: `Новое сообщение от ${senderName}`,
      body: text,
      url: "/chats",
    }),
    uk: (senderName: string, text: string): PushPayload => ({
      title: `Нове повідомлення від ${senderName}`,
      body: text,
      url: "/chats",
    }),
  },
} as const;

async function getUserLanguage(userId: string): Promise<SupportedLanguage> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return normalizeLanguage(user?.language);
}

export async function sendNewRequestNotification(
  driverId: string,
  passengerName: string,
  origin: string,
  destination: string
) {
  const language = await getUserLanguage(driverId);
  const payload = translations.newRequest[language](passengerName, origin, destination);
  await sendPushToUser(driverId, payload);
}

export async function sendRequestAcceptedNotification(
  passengerId: string,
  driverName: string,
  origin: string,
  destination: string
) {
  const language = await getUserLanguage(passengerId);
  const payload = translations.requestAccepted[language](driverName, origin, destination);
  await sendPushToUser(passengerId, payload);
}

export async function sendRequestRejectedNotification(
  passengerId: string,
  driverName: string,
  origin: string,
  destination: string
) {
  const language = await getUserLanguage(passengerId);
  const payload = translations.requestRejected[language](driverName, origin, destination);
  await sendPushToUser(passengerId, payload);
}

export async function sendRequestCancelledByPassengerNotification(
  driverId: string,
  passengerName: string,
  origin: string,
  destination: string
) {
  const language = await getUserLanguage(driverId);
  const payload = translations.requestCancelledByPassenger[language](
    passengerName,
    origin,
    destination
  );
  await sendPushToUser(driverId, payload);
}

export async function sendNewChatMessageNotification(
  recipientUserId: string,
  senderName: string,
  text: string,
  chatId: string
) {
  const language = await getUserLanguage(recipientUserId);
  const payload = translations.newChatMessage[language](senderName, text);

  await sendPushToUser(recipientUserId, {
    ...payload,
    url: `/chat/${chatId}`,
  });
}