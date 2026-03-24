import { Router } from "express";
import bcrypt from "bcrypt";
import sql from "mssql";
import { poolPromise } from "../config/db";
import { SuperAdminRequest } from "../middlewares/auth.middleware";
import { recordAuditLog } from "../services/platform.service";
import { signToken } from "../utils/paseto";
import {
  clearSessionCookie,
  setSessionCookie,
  SESSION_MAX_AGE_MS,
} from "../utils/sessionCookies";
import { createSession, revokeSession } from "../services/session.service";
import { resolveAuthenticatedSuperAdminSession } from "../services/requestAuth.service";

const router = Router();

function normalizeEmailAddress(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function setNoStoreHeaders(res: { setHeader(name: string, value: string): void }) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function setLogoutResponseHeaders(res: { setHeader(name: string, value: string): void }) {
  setNoStoreHeaders(res);
  res.setHeader("Clear-Site-Data", "\"cache\", \"storage\"");
}

router.post("/login", async (req, res) => {
  setNoStoreHeaders(res);
  const email = normalizeEmailAddress((req.body as { email?: unknown })?.email);
  const password = typeof (req.body as { password?: unknown })?.password === "string"
    ? (req.body as { password: string }).password
    : "";

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

    const { sessionId } = await createSession(admin.Id, req);
    const token = await signToken({
      adminId: admin.Id,
      email: admin.Email,
      sid: sessionId,
    });

    await pool
      .request()
      .input("id", sql.Int, admin.Id)
      .query(`UPDATE SuperAdminUsers SET LastLoginAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME() WHERE Id = @id`);

    setSessionCookie(req, res, token);
    try {
      await recordAuditLog({
        userId: admin.Id,
        action: "super_admin.login",
        entityType: "super-admin-user",
        entityKey: admin.Email,
        summary: `Super admin ${admin.Email} signed in`,
      });
    } catch (error) {
      console.error("Super Admin login audit log error:", error);
    }

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
  setNoStoreHeaders(res);
  const session = await resolveAuthenticatedSuperAdminSession(req, { touch: true });
  if (!session) {
    clearSessionCookie(req, res);
    return res.status(401).json({ message: "Invalid session" });
  }

  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("id", sql.Int, session.adminId)
    .query(`
      SELECT TOP 1 Id, Email, FullName
      FROM SuperAdminUsers
      WHERE Id = @id AND IsActive = 1
    `);

  const admin = result.recordset[0] as { Id: number; Email: string; FullName: string } | undefined;
  if (!admin) {
    await revokeSession(session.adminId, session.sessionId, "admin_inactive");
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
});

router.post("/logout", async (req: SuperAdminRequest, res) => {
  setLogoutResponseHeaders(res);
  const session = await resolveAuthenticatedSuperAdminSession(req);
  if (session) {
    await revokeSession(session.adminId, session.sessionId, "logout");
    try {
      await recordAuditLog({
        userId: session.adminId,
        action: "super_admin.logout",
        entityType: "super-admin-user",
        entityKey: session.email,
        summary: `Super admin ${session.email} signed out`,
      });
    } catch (error) {
      console.error("Super Admin logout audit log error:", error);
    }
  }

  clearSessionCookie(req, res);
  return res.status(204).send();
});

export default router;
