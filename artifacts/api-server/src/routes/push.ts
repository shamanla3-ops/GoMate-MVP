import { Router } from "express";
import webpush from "web-push";
import { db, pushSubscriptions, eq } from "@gomate/db";
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

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

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

    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));

    if (existing.length === 0) {
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
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