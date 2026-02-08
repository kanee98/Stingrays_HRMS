import { Router } from "express";
import { getByEmployee, upsertOverrides } from "../controllers/employeedeductions.controller";

const router = Router();

router.get("/:employeeId", getByEmployee);
router.put("/:employeeId", upsertOverrides);

export default router;
