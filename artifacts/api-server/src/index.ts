import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import tripRoutes from "./routes/trips.js";
import templateRoutes from "./routes/templates.js";
import tripRequestsRoutes from "./routes/tripRequests.js";
import tripChatsRoutes from "./routes/tripChats.js";
import pushRoutes from "./routes/push.js";
import notificationSummaryRoutes from "./routes/notificationSummary.js";
import profileRoutes from "./routes/profile.js";
import reviewsRoutes from "./routes/reviews.js";

dotenv.config({ path: "../../.env" });

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://getgomate.com",
    ],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/trip-requests", tripRequestsRoutes);
app.use("/api/trip-chats", tripChatsRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/notifications", notificationSummaryRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/reviews", reviewsRoutes);

app.get("/", (_req, res) => {
  res.send("GoMate API is running");
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});