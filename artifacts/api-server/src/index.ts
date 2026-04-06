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
import reviewTasksRoutes from "./routes/reviewTasks.js";
import permanentPassengersRoutes from "./routes/permanentPassengers.js";
import matchPreferencesRoutes from "./routes/matchPreferences.js";
import matchSuggestionsRoutes from "./routes/matchSuggestions.js";
import testEmailRouter from "./routes/testEmail.js";
import { startTripMaintenanceJobs } from "./jobs/autoCompleteTrips.js";

dotenv.config({ path: "../../.env" });

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://getgomate.com",
      "https://gomate.com",
      "https://www.gomate.com",
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
app.use("/api/review-tasks", reviewTasksRoutes);
app.use("/api/permanent-passengers", permanentPassengersRoutes);
app.use("/api/match-preferences", matchPreferencesRoutes);
app.use("/api/match-suggestions", matchSuggestionsRoutes);
app.use("/api/test-email", testEmailRouter);

app.get("/", (_req, res) => {
  res.send("GoMate API is running");
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startTripMaintenanceJobs();
});