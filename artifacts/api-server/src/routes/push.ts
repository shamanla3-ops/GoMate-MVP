import { Router } from "express";
import webpush from "web-push";
import { db, pushSubscriptions, eq } from "@gomate/db";
import { authMiddleware } from "../middleware/auth.js";

const router: Router = Router();

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
    const userId = req.user.id;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Invalid subscription data" });
    }

    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));

    if (existing.length === 0) {
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
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
      } catch (error: any) {
        console.error("Push send error:", error);
      }
    }
  } catch (error) {
    console.error("Load subscriptions error:", error);
  }
}

export default router;