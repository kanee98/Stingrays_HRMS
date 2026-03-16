import { Router } from "express";
import sql from "mssql";
import { poolPromise } from "../config/db";
import { SuperAdminRequest } from "../middlewares/auth.middleware";
import {
  getClientAccessSnapshotById,
  recordAuditLog,
  syncClientAccessRows,
} from "../services/platform.service";

const router = Router();

function normalizeStatus(value: string | undefined): string {
  const normalized = (value || "active").trim().toLowerCase();
  return ["active", "inactive", "pilot", "suspended"].includes(normalized) ? normalized : "active";
}

router.get("/", async (_req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        c.Id,
        c.ClientKey,
        c.Name,
        c.Description,
        c.ContactEmail,
        c.Status,
        c.DefaultTimezone,
        c.MaintenanceMessage,
        c.CreatedAt,
        c.UpdatedAt,
        COUNT(DISTINCT CASE WHEN cs.IsEnabled = 1 THEN cs.Id END) AS EnabledServices,
        COUNT(DISTINCT CASE WHEN css.IsEnabled = 1 THEN css.Id END) AS EnabledSections
      FROM Clients c
      LEFT JOIN ClientServices cs ON cs.ClientId = c.Id
      LEFT JOIN ClientServiceSections css ON css.ClientServiceId = cs.Id
      GROUP BY
        c.Id,
        c.ClientKey,
        c.Name,
        c.Description,
        c.ContactEmail,
        c.Status,
        c.DefaultTimezone,
        c.MaintenanceMessage,
        c.CreatedAt,
        c.UpdatedAt
      ORDER BY c.Name
    `);

    return res.json(result.recordset);
  } catch (error) {
    console.error("Failed to list clients:", error);
    return res.status(500).json({ message: "Failed to list clients" });
  }
});

router.post("/", async (req: SuperAdminRequest, res) => {
  const { clientKey, name, description, contactEmail, status, defaultTimezone, maintenanceMessage } = req.body as {
    clientKey?: string;
    name?: string;
    description?: string;
    contactEmail?: string;
    status?: string;
    defaultTimezone?: string;
    maintenanceMessage?: string;
  };

  if (!clientKey?.trim() || !name?.trim()) {
    return res.status(400).json({ message: "clientKey and name are required" });
  }

  try {
    const pool = await poolPromise;
    const insertResult = await pool
      .request()
      .input("clientKey", sql.NVarChar, clientKey.trim().toLowerCase())
      .input("name", sql.NVarChar, name.trim())
      .input("description", sql.NVarChar, description || null)
      .input("contactEmail", sql.NVarChar, contactEmail || null)
      .input("status", sql.NVarChar, normalizeStatus(status))
      .input("defaultTimezone", sql.NVarChar, defaultTimezone || "Asia/Colombo")
      .input("maintenanceMessage", sql.NVarChar, maintenanceMessage || null)
      .query(`
        INSERT INTO Clients (ClientKey, Name, Description, ContactEmail, Status, DefaultTimezone, MaintenanceMessage)
        OUTPUT INSERTED.Id
        VALUES (@clientKey, @name, @description, @contactEmail, @status, @defaultTimezone, @maintenanceMessage)
      `);

    const clientId = Number(insertResult.recordset[0]?.Id);
    await syncClientAccessRows(clientId);
    await recordAuditLog({
      userId: req.superAdmin?.adminId,
      action: "client.create",
      entityType: "client",
      entityKey: clientKey.trim().toLowerCase(),
      summary: `Created client ${name.trim()}`,
      payload: req.body,
    });

    return res.status(201).json({ id: clientId });
  } catch (error) {
    console.error("Failed to create client:", error);
    return res.status(500).json({ message: "Failed to create client" });
  }
});

router.get("/:id", async (req, res) => {
  const clientId = Number(req.params.id);

  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ message: "Invalid client id" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id", sql.Int, clientId)
      .query(`SELECT TOP 1 * FROM Clients WHERE Id = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Client not found" });
    }

    return res.json(result.recordset[0]);
  } catch (error) {
    console.error("Failed to load client:", error);
    return res.status(500).json({ message: "Failed to load client" });
  }
});

router.put("/:id", async (req: SuperAdminRequest, res) => {
  const clientId = Number(req.params.id);

  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ message: "Invalid client id" });
  }

  const { name, description, contactEmail, status, defaultTimezone, maintenanceMessage } = req.body as {
    name?: string;
    description?: string;
    contactEmail?: string;
    status?: string;
    defaultTimezone?: string;
    maintenanceMessage?: string;
  };

  if (!name?.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  try {
    const pool = await poolPromise;
    await pool
      .request()
      .input("id", sql.Int, clientId)
      .input("name", sql.NVarChar, name.trim())
      .input("description", sql.NVarChar, description || null)
      .input("contactEmail", sql.NVarChar, contactEmail || null)
      .input("status", sql.NVarChar, normalizeStatus(status))
      .input("defaultTimezone", sql.NVarChar, defaultTimezone || "Asia/Colombo")
      .input("maintenanceMessage", sql.NVarChar, maintenanceMessage || null)
      .query(`
        UPDATE Clients
        SET Name = @name,
            Description = @description,
            ContactEmail = @contactEmail,
            Status = @status,
            DefaultTimezone = @defaultTimezone,
            MaintenanceMessage = @maintenanceMessage,
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @id
      `);

    await recordAuditLog({
      userId: req.superAdmin?.adminId,
      action: "client.update",
      entityType: "client",
      entityKey: String(clientId),
      summary: `Updated client ${name.trim()}`,
      payload: req.body,
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Failed to update client:", error);
    return res.status(500).json({ message: "Failed to update client" });
  }
});

router.get("/:id/access", async (req, res) => {
  const clientId = Number(req.params.id);

  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ message: "Invalid client id" });
  }

  try {
    const snapshot = await getClientAccessSnapshotById(clientId);
    if (!snapshot) {
      return res.status(404).json({ message: "Client not found" });
    }

    return res.json(snapshot);
  } catch (error) {
    console.error("Failed to load client access:", error);
    return res.status(500).json({ message: "Failed to load client access" });
  }
});

router.put("/:id/access", async (req: SuperAdminRequest, res) => {
  const clientId = Number(req.params.id);

  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ message: "Invalid client id" });
  }

  const { services, sections } = req.body as {
    services?: Array<{ serviceId: number; isEnabled: boolean; configJson?: string | null }>;
    sections?: Array<{ sectionId: number; isEnabled: boolean; configJson?: string | null }>;
  };

  try {
    await syncClientAccessRows(clientId);
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const service of services || []) {
        await new sql.Request(transaction)
          .input("clientId", sql.Int, clientId)
          .input("serviceId", sql.Int, service.serviceId)
          .input("isEnabled", sql.Bit, service.isEnabled)
          .input("configJson", sql.NVarChar(sql.MAX), service.configJson || null)
          .query(`
            UPDATE ClientServices
            SET IsEnabled = @isEnabled,
                ConfigJson = @configJson,
                UpdatedAt = SYSUTCDATETIME()
            WHERE ClientId = @clientId AND ServiceId = @serviceId
          `);
      }

      for (const section of sections || []) {
        await new sql.Request(transaction)
          .input("clientId", sql.Int, clientId)
          .input("sectionId", sql.Int, section.sectionId)
          .input("isEnabled", sql.Bit, section.isEnabled)
          .input("configJson", sql.NVarChar(sql.MAX), section.configJson || null)
          .query(`
            UPDATE css
            SET css.IsEnabled = @isEnabled,
                css.ConfigJson = @configJson,
                css.UpdatedAt = SYSUTCDATETIME()
            FROM ClientServiceSections css
            JOIN ClientServices cs ON cs.Id = css.ClientServiceId
            WHERE cs.ClientId = @clientId AND css.SectionId = @sectionId
          `);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    await recordAuditLog({
      userId: req.superAdmin?.adminId,
      action: "client.access.update",
      entityType: "client-access",
      entityKey: String(clientId),
      summary: `Updated client access policy for client ${clientId}`,
      payload: req.body,
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Failed to update client access:", error);
    return res.status(500).json({ message: "Failed to update client access" });
  }
});

export default router;
