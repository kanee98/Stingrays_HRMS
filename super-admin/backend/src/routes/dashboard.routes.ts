import { Router } from "express";
import { poolPromise } from "../config/db";

const router = Router();

router.get("/overview", async (_req, res) => {
  try {
    const pool = await poolPromise;
    const summaryResult = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Clients) AS TotalClients,
        (SELECT COUNT(*) FROM Clients WHERE Status = 'active') AS ActiveClients,
        (SELECT COUNT(*) FROM ServiceCatalog) AS TotalServices,
        (SELECT COUNT(*) FROM ClientServices WHERE IsEnabled = 1) AS EnabledServiceAssignments,
        (SELECT COUNT(*) FROM ClientServiceSections WHERE IsEnabled = 1) AS EnabledSectionAssignments
    `);

    const auditResult = await pool.request().query(`
      SELECT TOP 10
        al.Id,
        al.Action,
        al.EntityType,
        al.EntityKey,
        al.Summary,
        al.CreatedAt,
        su.Email AS UserEmail
      FROM SuperAdminAuditLogs al
      LEFT JOIN SuperAdminUsers su ON su.Id = al.UserId
      ORDER BY al.CreatedAt DESC
    `);

    return res.json({
      summary: summaryResult.recordset[0],
      recentAuditLogs: auditResult.recordset,
    });
  } catch (error) {
    console.error("Failed to load dashboard overview:", error);
    return res.status(500).json({ message: "Failed to load dashboard overview" });
  }
});

export default router;
