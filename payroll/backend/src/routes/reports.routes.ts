import { Router } from "express";
import { payrollSummary, monthlyDetail } from "../controllers/reports.controller";

const router = Router();

router.get("/payroll-summary", payrollSummary);
router.get("/monthly-detail", monthlyDetail);

export default router;
