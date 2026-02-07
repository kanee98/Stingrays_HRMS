import { Router } from "express";
import {
  listDeductionRules,
  createDeductionRule,
  updateDeductionRule,
  deleteDeductionRule,
} from "../controllers/deductionrules.controller";

const router = Router();

router.get("/", listDeductionRules);
router.post("/", createDeductionRule);
router.put("/:id", updateDeductionRule);
router.delete("/:id", deleteDeductionRule);

export default router;
