import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ensureDbConnection } from "./config/db";
import payrunsRoutes from "./routes/payruns.routes";
import payslipsRoutes from "./routes/payslips.routes";
import taxbracketsRoutes from "./routes/taxbrackets.routes";
import deductionrulesRoutes from "./routes/deductionrules.routes";
import employeedeductionsRoutes from "./routes/employeedeductions.routes";
import reportsRoutes from "./routes/reports.routes";
import employeesRoutes from "./routes/employees.routes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/payruns", payrunsRoutes);
app.use("/api/payslips", payslipsRoutes);
app.use("/api/taxbrackets", taxbracketsRoutes);
app.use("/api/deductionrules", deductionrulesRoutes);
app.use("/api/employeedeductions", employeedeductionsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/employees", employeesRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 4010;

ensureDbConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Payroll service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
