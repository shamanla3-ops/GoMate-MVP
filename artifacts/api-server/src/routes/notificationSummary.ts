import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { getNotificationCounts } from "../lib/notificationCounts.js";

const router: Router = Router();

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const counts = await getNotificationCounts(user.userId);
    res.json(counts);
  } catch (err) {
    console.error("Notification summary error:", err);
    res.status(500).json({ error: "Failed to load notification summary" });
  }
});

export default router;
