import { Router } from "express";
import webpush from "web-push";
import { db } from "@gomate/db";
import { authMiddleware } from "../middleware/auth.js";

const router: Router = Router();

type PushSubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

type QueryRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PgLikeClient = {
  query: (
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: QueryRow[] }>;
};

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function getClient(): PgLikeClient {
  return db.$client as unknown as PgLikeClient;
}

router.get("/public-key", (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

router.post("/subscribe", authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user?.userId as string | undefined;
    const subscription = (req.body ?? {}) as PushSubscriptionBody;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return res.status(400).json({ error: "Invalid subscription" });
    }

    console.log("Saving push subscription:", {
      userId,
      endpoint: subscription.endpoint,
    });

    const client = getClient();

    await client.query(
      `
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (endpoint) DO NOTHING
      `,
      [
        userId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
      ]
    );

    console.log("Subscription saved!");

    return res.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    const client = getClient();

    const result = await client.query(
      `
        SELECT endpoint, p256dh, auth
        FROM push_subscriptions
        WHERE user_id = $1
      `,
      [userId]
    );

    console.log("Found subscriptions:", result.rows.length);

    for (const row of result.rows) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          JSON.stringify(payload)
        );
      } catch (error) {
        console.error("Push send error:", error);
      }
    }
  } catch (error) {
    console.error("Load subscriptions error:", error);
  }
}

export default router;