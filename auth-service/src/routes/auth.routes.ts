import { Router } from "express";
import { getSession, login, logout } from "../controllers/auth.controller";

const router = Router();

router.post("/login", login);
router.get("/session", getSession);
router.post("/logout", logout);

export default router;
