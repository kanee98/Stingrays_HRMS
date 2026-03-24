import { Router } from "express";
import { getClientAccessSnapshotByKey } from "../services/platform.service";

const router = Router();

router.get("/client-access", async (req, res) => {
  const clientKey = String(req.query.clientKey || "").trim();

  if (!clientKey) {
    return res.status(400).json({ message: "clientKey is required" });
  }

  try {
    const snapshot = await getClientAccessSnapshotByKey(clientKey);
    if (!snapshot) {
      return res.status(404).json({ message: "Client not found" });
    }

    return res.json(snapshot);
  } catch (error) {
    console.error("Failed to load client access snapshot:", error);
    return res.status(500).json({ message: "Failed to load client access" });
  }
});

export default router;
