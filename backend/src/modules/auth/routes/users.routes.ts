import { Router } from "express";
import { listUsers, listRoles, createUser, updateUser, deleteUser } from "../controllers/users.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);
router.get("/", listUsers);
router.get("/roles", listRoles);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
