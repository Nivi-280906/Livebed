import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import hospitalsRouter from "./routes/hospitals.js";
import bookingsRouter from "./routes/bookings.js";
import usersRouter from "./routes/users.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/hospitals", hospitalsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/users", usersRouter);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`LiveBed API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
