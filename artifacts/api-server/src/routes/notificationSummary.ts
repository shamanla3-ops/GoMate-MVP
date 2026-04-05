import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { getNotificationCounts } from "../lib/notificationCounts.js";
import { jsonApiError } from "../lib/apiErrors.js";

const router: Router = Router();

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      jsonApiError(res, 401, "UNAUTHORIZED");
      return;
    }

    const counts = await getNotificationCounts(user.userId);
    res.json(counts);
  } catch (err) {
    console.error("Notification summary error:", err);
    jsonApiError(res, 500, "NOTIFICATION_SUMMARY_FAILED");
  }
});

export default router;
