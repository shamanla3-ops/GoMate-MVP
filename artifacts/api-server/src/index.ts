import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import tripsRoutes from "./routes/trips.js";
import templatesRoutes from "./routes/templates.js";
import profileRoutes from "./routes/profile.js";
import tripRequestsRoutes from "./routes/tripRequests.js";
import tripChatsRoutes from "./routes/tripChats.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

const app = express();
const PORT = 4000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => {
  res.json({ message: "GoMate API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripsRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/trip-requests", tripRequestsRoutes);
app.use("/api/trip-chats", tripChatsRoutes);

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});