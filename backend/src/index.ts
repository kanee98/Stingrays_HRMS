import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import { createCorsMiddleware } from "./config/cors";
import authRoutes from "./modules/auth/routes/auth.routes";
import usersRoutes from "./modules/auth/routes/users.routes";
import { ensureDbConnection as ensureAuthDbConnection } from "./modules/auth/config/db";
import { ensureSessionStore } from "./modules/auth/services/session.service";
import { ensureAuthSchema } from "./modules/auth/services/userSchema.service";
import clientsRoutes from "./modules/admin/routes/clients.routes";
import dashboardRoutes from "./modules/admin/routes/dashboard.routes";
import auditRoutes from "./modules/admin/routes/audit.routes";
import publicRoutes from "./modules/admin/routes/public.routes";
import superAdminAuthRoutes from "./modules/admin/routes/auth.routes";
import { ensureDbConnection as ensureSuperAdminDbConnection } from "./modules/admin/config/db";
import { authenticateSuperAdmin } from "./modules/admin/middlewares/auth.middleware";
import { ensureSuperAdminPlatform } from "./modules/admin/services/platform.service";
import payrunsRoutes from "./modules/payroll/routes/payruns.routes";
import payslipsRoutes from "./modules/payroll/routes/payslips.routes";
import taxbracketsRoutes from "./modules/payroll/routes/taxbrackets.routes";
import deductionrulesRoutes from "./modules/payroll/routes/deductionrules.routes";
import employeedeductionsRoutes from "./modules/payroll/routes/employeedeductions.routes";
import reportsRoutes from "./modules/payroll/routes/reports.routes";
import payrollEmployeesRoutes from "./modules/payroll/routes/employees.routes";
import { ensureDbConnection as ensurePayrollDbConnection } from "./modules/payroll/config/db";

const {
  initializeOnboardingModule,
  registerOnboardingRoutes,
} = require("./modules/onboarding/bootstrap") as {
  initializeOnboardingModule: () => Promise<void>;
  registerOnboardingRoutes: (app: express.Express) => void;
};

dotenv.config();

const app = express();
app.set("trust proxy", 1);

app.use(createCorsMiddleware());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);

registerOnboardingRoutes(app);

for (const basePath of ["/api/payroll", "/api/payroll/api"]) {
  app.use(`${basePath}/payruns`, payrunsRoutes);
  app.use(`${basePath}/payslips`, payslipsRoutes);
  app.use(`${basePath}/taxbrackets`, taxbracketsRoutes);
  app.use(`${basePath}/deductionrules`, deductionrulesRoutes);
  app.use(`${basePath}/employeedeductions`, employeedeductionsRoutes);
  app.use(`${basePath}/reports`, reportsRoutes);
  app.use(`${basePath}/employees`, payrollEmployeesRoutes);
}

app.use("/api/admin/public", publicRoutes);
app.use("/api/admin/auth", superAdminAuthRoutes);
app.use("/api/admin/dashboard", authenticateSuperAdmin, dashboardRoutes);
app.use("/api/admin/clients", authenticateSuperAdmin, clientsRoutes);
app.use("/api/admin/audit-logs", authenticateSuperAdmin, auditRoutes);

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled backend error:", error);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || "4000");

async function bootstrap() {
  await Promise.all([
    ensureAuthDbConnection(),
    ensurePayrollDbConnection(),
    ensureSuperAdminDbConnection(),
  ]);
  await initializeOnboardingModule();
  await ensureAuthSchema();
  await ensureSessionStore();
  await ensureSuperAdminPlatform();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Unified backend running on port ${PORT}`);
  });
}

void bootstrap().catch((error) => {
  console.error("Failed to start unified backend:", error);
  process.exit(1);
});
