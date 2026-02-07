import { Router } from "express";
import {
  listPayslips,
  getPayslip,
  createPayslip,
  updatePayslip,
  deletePayslip,
} from "../controllers/payslips.controller";

const router = Router();

router.get("/", listPayslips);
router.get("/:id", getPayslip);
router.post("/", createPayslip);
router.put("/:id", updatePayslip);
router.delete("/:id", deletePayslip);

export default router;
