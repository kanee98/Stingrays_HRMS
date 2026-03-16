import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./routes/auth.routes";
import auditRoutes from "./routes/audit.routes";
import clientsRoutes from "./routes/clients.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import publicRoutes from "./routes/public.routes";
import { ensureDbConnection } from "./config/db";
import { authenticateSuperAdmin } from "./middlewares/auth.middleware";
import { ensureSuperAdminPlatform } from "./services/platform.service";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", authenticateSuperAdmin, dashboardRoutes);
app.use("/api/clients", authenticateSuperAdmin, clientsRoutes);
app.use("/api/audit-logs", authenticateSuperAdmin, auditRoutes);

const PORT = Number(process.env.PORT || "4020");

ensureDbConnection()
  .then(() => ensureSuperAdminPlatform())
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Super Admin API running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start Super Admin API:", error);
    process.exit(1);
  });
