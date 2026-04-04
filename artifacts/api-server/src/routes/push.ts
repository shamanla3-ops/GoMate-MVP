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

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) {
    return true;
  }

  const email = process.env.VAPID_EMAIL;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!email || !publicKey || !privateKey) {
    console.warn(
      "[push] VAPID_EMAIL, VAPID_PUBLIC_KEY, or VAPID_PRIVATE_KEY missing; push sending disabled"
    );
    return false;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

router.get("/public-key", (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY ?? null;
  res.json({ key });
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

    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;

    // Do not use ON CONFLICT: Neon may not have UNIQUE(endpoint). Replace row for this endpoint.
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));

    await db.insert(pushSubscriptions).values({
      userId,
      endpoint,
      p256dh,
      auth,
    });

    console.log("[push] Subscription saved", {
      userId,
      endpointPrefix: endpoint.slice(0, 48),
    });

    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[push] Subscribe error:", message, error);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

function isGoneSubscriptionError(error: unknown): boolean {
  const err = error as { statusCode?: number };
  return err?.statusCode === 404 || err?.statusCode === 410;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapidConfigured()) {
    return;
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
  });

  try {
    const rows = await db
      .select({
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    console.log("[push] Sending to user", { userId, subscriptions: rows.length });

    for (const row of rows) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          body
        );
      } catch (error) {
        console.error("[push] Send error:", error);
        if (isGoneSubscriptionError(error)) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, row.endpoint));
          console.log("[push] Removed invalid subscription", {
            endpointPrefix: row.endpoint.slice(0, 48),
          });
        }
      }
    }
  } catch (error) {
    console.error("[push] Load subscriptions error:", error);
  }
}

export default router;
