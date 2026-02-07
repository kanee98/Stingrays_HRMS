import { Router } from "express";
import {
  listTaxBrackets,
  createTaxBracket,
  updateTaxBracket,
  deleteTaxBracket,
} from "../controllers/taxbrackets.controller";

const router = Router();

router.get("/", listTaxBrackets);
router.post("/", createTaxBracket);
router.put("/:id", updateTaxBracket);
router.delete("/:id", deleteTaxBracket);

export default router;
