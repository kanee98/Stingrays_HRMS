import crypto from "crypto";
import type { Request } from "express";
import sql from "mssql";
import { poolPromise } from "../config/db";
import { SESSION_MAX_AGE_MS } from "../utils/sessionCookies";

function getClientIpAddress(req: Request): string | null {
  const forwardedFor = req.header("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    const normalizedIp = firstIp?.trim();
    if (normalizedIp) {
      return normalizedIp;
    }
  }

  return req.socket.remoteAddress || null;
}

function getUserAgent(req: Request): string | null {
  const userAgent = req.header("user-agent")?.trim();
  return userAgent || null;
}

export function getAdminIdFromPayload(payload: Record<string, unknown>): number | null {
  const adminId = Number(payload.adminId);
  return Number.isInteger(adminId) ? adminId : null;
}

export function getSessionIdFromPayload(payload: Record<string, unknown>): string | null {
  const sessionId = payload.sid;
  return typeof sessionId === "string" && sessionId.trim() ? sessionId : null;
}

export async function ensureSuperAdminSessionStore(): Promise<void> {
  const pool = await poolPromise;
  await pool.request().query(`
    IF OBJECT_ID('SuperAdminSessions', 'U') IS NULL
    BEGIN
      CREATE TABLE SuperAdminSessions (
        SessionId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        AdminId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SuperAdminSessions_CreatedAt DEFAULT SYSUTCDATETIME(),
        LastSeenAt DATETIME2 NOT NULL CONSTRAINT DF_SuperAdminSessions_LastSeenAt DEFAULT SYSUTCDATETIME(),
        ExpiresAt DATETIME2 NOT NULL,
        RevokedAt DATETIME2 NULL,
        RevokedReason NVARCHAR(100) NULL,
        UserAgent NVARCHAR(512) NULL,
        IpAddress NVARCHAR(64) NULL,
        CONSTRAINT FK_SuperAdminSessions_SuperAdminUsers FOREIGN KEY (AdminId) REFERENCES SuperAdminUsers(Id) ON DELETE CASCADE
      );

      CREATE INDEX IX_SuperAdminSessions_AdminId_RevokedAt_ExpiresAt
      ON SuperAdminSessions (AdminId, RevokedAt, ExpiresAt);
    END
  `);
}

export async function createSession(adminId: number, req: Request): Promise<{ sessionId: string; expiresAt: Date }> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
  const pool = await poolPromise;

  await pool
    .request()
    .input("sessionId", sql.UniqueIdentifier, sessionId)
    .input("adminId", sql.Int, adminId)
    .input("expiresAt", sql.DateTime2, expiresAt)
    .input("userAgent", sql.NVarChar(512), getUserAgent(req))
    .input("ipAddress", sql.NVarChar(64), getClientIpAddress(req))
    .query(`
      INSERT INTO SuperAdminSessions (SessionId, AdminId, ExpiresAt, UserAgent, IpAddress)
      VALUES (@sessionId, @adminId, @expiresAt, @userAgent, @ipAddress)
    `);

  return { sessionId, expiresAt };
}

export async function isSessionActive(adminId: number, sessionId: string): Promise<boolean> {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("sessionId", sql.UniqueIdentifier, sessionId)
    .input("adminId", sql.Int, adminId)
    .query(`
      SELECT TOP 1 SessionId
      FROM SuperAdminSessions
      WHERE SessionId = @sessionId
        AND AdminId = @adminId
        AND RevokedAt IS NULL
        AND ExpiresAt > SYSUTCDATETIME()
    `);

  return result.recordset.length > 0;
}

export async function touchSession(adminId: number, sessionId: string): Promise<void> {
  const pool = await poolPromise;
  await pool
    .request()
    .input("sessionId", sql.UniqueIdentifier, sessionId)
    .input("adminId", sql.Int, adminId)
    .query(`
      UPDATE SuperAdminSessions
      SET LastSeenAt = SYSUTCDATETIME()
      WHERE SessionId = @sessionId
        AND AdminId = @adminId
        AND RevokedAt IS NULL
    `);
}

export async function revokeSession(adminId: number, sessionId: string, reason = "logout"): Promise<void> {
  const pool = await poolPromise;
  await pool
    .request()
    .input("sessionId", sql.UniqueIdentifier, sessionId)
    .input("adminId", sql.Int, adminId)
    .input("reason", sql.NVarChar(100), reason)
    .query(`
      UPDATE SuperAdminSessions
      SET RevokedAt = COALESCE(RevokedAt, SYSUTCDATETIME()),
          RevokedReason = COALESCE(RevokedReason, @reason)
      WHERE SessionId = @sessionId
        AND AdminId = @adminId
    `);
}
