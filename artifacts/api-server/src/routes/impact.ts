import { Router, type Request, type Response } from "express";
import { getPublicImpactStats } from "../lib/ecoProfileSummary.js";

const router: Router = Router();

/**
 * Public community impact — no authentication, no user population metrics.
 */
router.get("/public", async (_req: Request, res: Response) => {
  try {
    const stats = await getPublicImpactStats();
    res.json({
      completedTrips: stats.completedTrips,
      totalCo2KgSaved: stats.totalCo2Kg,
    });
  } catch (err) {
    console.error("public impact error:", err);
    res.status(500).json({ error: "IMPACT_PUBLIC_FAILED" });
  }
});

export default router;
