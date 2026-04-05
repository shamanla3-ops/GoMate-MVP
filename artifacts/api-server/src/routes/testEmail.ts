import { Router, Request, Response } from "express";
import { sendTestEmail } from "../lib/email.js";

const router: Router = Router();

/** POST /api/test-email — dev-only test; body: { email: string } */
router.post("/", async (req: Request, res: Response) => {
  try {
    const raw = (req.body as { email?: unknown }).email;
    if (typeof raw !== "string" || raw.trim() === "") {
      res.status(400).json({ message: "email is required" });
      return;
    }

    await sendTestEmail(raw);
    res.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send test email";
    res.status(500).json({ message });
  }
});

export default router;
