import { Router } from "express";
import {
  listPayRuns,
  getPayRun,
  createPayRun,
  finalizePayRun,
  deletePayRun,
} from "../controllers/payruns.controller";
import { generatePayslipsForPayRun } from "../controllers/payslips.controller";

const router = Router();

router.get("/", listPayRuns);
router.get("/:id", getPayRun);
router.post("/", createPayRun);
router.post("/:id/finalize", finalizePayRun);
router.post("/:id/generate-payslips", generatePayslipsForPayRun);
router.delete("/:id", deletePayRun);

export default router;
