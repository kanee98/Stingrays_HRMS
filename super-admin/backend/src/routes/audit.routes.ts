import { Router } from "express";
import sql from "mssql";
import { poolPromise } from "../config/db";

const router = Router();

router.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("limit", sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          al.Id,
          al.Action,
          al.EntityType,
          al.EntityKey,
          al.Summary,
          al.PayloadJson,
          al.CreatedAt,
          su.Email AS UserEmail
        FROM SuperAdminAuditLogs al
        LEFT JOIN SuperAdminUsers su ON su.Id = al.UserId
        ORDER BY al.CreatedAt DESC
      `);

    return res.json(result.recordset);
  } catch (error) {
    console.error("Failed to load audit logs:", error);
    return res.status(500).json({ message: "Failed to load audit logs" });
  }
});

export default router;
