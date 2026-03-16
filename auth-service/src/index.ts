import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import { ensureDbConnection } from "./config/db";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);

const PORT = Number(process.env.PORT) || 4000;

// Initialize database connection before starting server
ensureDbConnection()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Auth service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
