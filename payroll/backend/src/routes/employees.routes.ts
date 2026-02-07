import { Router } from "express";
import { listEmployees } from "../controllers/employees.controller";

const router = Router();

router.get("/", listEmployees);

export default router;
