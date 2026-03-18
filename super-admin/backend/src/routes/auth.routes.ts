import { Router } from "express";
import bcrypt from "bcrypt";
import sql from "mssql";
import { poolPromise } from "../config/db";
import { SuperAdminRequest } from "../middlewares/auth.middleware";
import { recordAuditLog } from "../services/platform.service";
import { signToken, verifyToken } from "../utils/paseto";
import {
  clearSessionCookie,
  getSessionTokenFromRequest,
  setSessionCookie,
  SESSION_MAX_AGE_MS,
} from "../utils/sessionCookies";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query(`
        SELECT TOP 1 Id, Email, FullName, PasswordHash, IsActive
        FROM SuperAdminUsers
        WHERE Email = @email
      `);

    const admin = result.recordset[0] as
      | { Id: number; Email: string; FullName: string; PasswordHash: string; IsActive: boolean }
      | undefined;

    if (!admin || !admin.IsActive) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, admin.PasswordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = await signToken({
      adminId: admin.Id,
      email: admin.Email,
    });

    await pool
      .request()
      .input("id", sql.Int, admin.Id)
      .query(`UPDATE SuperAdminUsers SET LastLoginAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME() WHERE Id = @id`);

    setSessionCookie(req, res, token);
    await recordAuditLog({
      userId: admin.Id,
      action: "super_admin.login",
      entityType: "super-admin-user",
      entityKey: admin.Email,
      summary: `Super admin ${admin.Email} signed in`,
    });

    return res.json({
      expiresIn: Math.floor(SESSION_MAX_AGE_MS / 1000),
      user: {
        id: admin.Id,
        email: admin.Email,
        fullName: admin.FullName,
      },
    });
  } catch (error) {
    console.error("Super Admin login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/session", async (req: SuperAdminRequest, res) => {
  const token = getSessionTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const payload = await verifyToken(token);
    const adminId = Number(payload.adminId);
    if (!Number.isInteger(adminId)) {
      clearSessionCookie(req, res);
      return res.status(401).json({ message: "Invalid session" });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id", sql.Int, adminId)
      .query(`
        SELECT TOP 1 Id, Email, FullName
        FROM SuperAdminUsers
        WHERE Id = @id AND IsActive = 1
      `);

    const admin = result.recordset[0] as { Id: number; Email: string; FullName: string } | undefined;
    if (!admin) {
      clearSessionCookie(req, res);
      return res.status(401).json({ message: "Session expired" });
    }

    return res.json({
      user: {
        id: admin.Id,
        email: admin.Email,
        fullName: admin.FullName,
      },
    });
  } catch {
    clearSessionCookie(req, res);
    return res.status(401).json({ message: "Invalid session" });
  }
});

router.post("/logout", async (req: SuperAdminRequest, res) => {
  const token = getSessionTokenFromRequest(req);
  if (token) {
    try {
      const payload = await verifyToken(token);
      const adminId = Number(payload.adminId);
      if (Number.isInteger(adminId)) {
        const pool = await poolPromise;
        const result = await pool
          .request()
          .input("id", sql.Int, adminId)
          .query(`SELECT TOP 1 Email FROM SuperAdminUsers WHERE Id = @id`);

        const email = String(result.recordset[0]?.Email || payload.email || "");
        if (!email) {
          throw new Error("Super admin email not found");
        }

        await recordAuditLog({
          userId: adminId,
          action: "super_admin.logout",
          entityType: "super-admin-user",
          entityKey: email,
          summary: `Super admin ${email} signed out`,
        });
      }
    } catch {
      // best-effort logging
    }
  }

  clearSessionCookie(req, res);
  return res.status(204).send();
});

export default router;
