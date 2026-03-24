import { Router } from "express";
import { changePassword, getSession, login, logout } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.get("/session", getSession);
router.post("/logout", logout);
router.post("/change-password", authenticate, changePassword);

export default router;
