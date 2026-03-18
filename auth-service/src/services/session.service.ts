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

export function getUserIdFromPayload(payload: Record<string, unknown>): number | null {
  const userId = Number(payload.userid);
  return Number.isInteger(userId) ? userId : null;
}

export function getSessionIdFromPayload(payload: Record<string, unknown>): string | null {
  const sessionId = payload.sid;
  return typeof sessionId === "string" && sessionId.trim() ? sessionId : null;
}

export async function ensureSessionStore(): Promise<void> {
  const pool = await poolPromise;
  await pool.request().query(`
    IF OBJECT_ID('UserSessions', 'U') IS NULL
    BEGIN
      CREATE TABLE UserSessions (
        SessionId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserSessions_CreatedAt DEFAULT SYSUTCDATETIME(),
        LastSeenAt DATETIME2 NOT NULL CONSTRAINT DF_UserSessions_LastSeenAt DEFAULT SYSUTCDATETIME(),
        ExpiresAt DATETIME2 NOT NULL,
        RevokedAt DATETIME2 NULL,
        RevokedReason NVARCHAR(100) NULL,
        UserAgent NVARCHAR(512) NULL,
        IpAddress NVARCHAR(64) NULL,
        CONSTRAINT FK_UserSessions_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
      );

      CREATE INDEX IX_UserSessions_UserId_RevokedAt_ExpiresAt
      ON UserSessions (UserId, RevokedAt, ExpiresAt);
    END
  `);
}

export async function createSession(userId: number, req: Request): Promise<{ sessionId: string; expiresAt: Date }> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
  const pool = await poolPromise;

  await pool
    .request()
    .input("sessionId", sql.UniqueIdentifier, sessionId)
    .input("userId", sql.Int, userId)
    .input("expiresAt", sql.DateTime2, expiresAt)
    .input("userAgent", sql.NVarChar(512), getUserAgent(req))
    .input("ipAddress", sql.NVarChar(64), getClientIpAddress(req))
    .query(`
      INSERT INTO UserSessions (SessionId, UserId, ExpiresAt, UserAgent, IpAddress)
      VALUES (@sessionId, @userId, @expiresAt, @userAgent, @ipAddress)
    `);

  return { sessionId, expiresAt };
}

export async function isSessionActive(userId: number, sessionId: string): Promise<boolean> {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("sessionId", sql.UniqueIdentifier, sessionId)
    .input("userId", sql.Int, userId)
    .query(`
      SELECT TOP 1 SessionId
      FROM UserSessions
      WHERE SessionId = @sessionId
        AND UserId = @userId
        AND RevokedAt IS NULL
        AND ExpiresAt > SYSUTCDATETIME()
    `);

  return result.recordset.length > 0;
}

export async function touchSession(userId: number, sessionId: string): Promise<void> {
  const pool = await poolPromise;
  await pool
    .request()
    .input("sessionId", sql.UniqueIdentifier, sessionId)
    .input("userId", sql.Int, userId)
    .query(`
      UPDATE UserSessions
      SET LastSeenAt = SYSUTCDATETIME()
      WHERE SessionId = @sessionId
        AND UserId = @userId
        AND RevokedAt IS NULL
    `);
}

export async function revokeSession(userId: number, sessionId: string, reason = "logout"): Promise<void> {
  const pool = await poolPromise;
  await pool
    .request()
    .input("sessionId", sql.UniqueIdentifier, sessionId)
    .input("userId", sql.Int, userId)
    .input("reason", sql.NVarChar(100), reason)
    .query(`
      UPDATE UserSessions
      SET RevokedAt = COALESCE(RevokedAt, SYSUTCDATETIME()),
          RevokedReason = COALESCE(RevokedReason, @reason)
      WHERE SessionId = @sessionId
        AND UserId = @userId
    `);
}

export async function revokeSessionsForUser(
  userId: number,
  options: { exceptSessionId?: string | null; reason?: string } = {},
): Promise<void> {
  const pool = await poolPromise;
  const reason = options.reason || "password_changed";

  await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("exceptSessionId", sql.UniqueIdentifier, options.exceptSessionId ?? null)
    .input("reason", sql.NVarChar(100), reason)
    .query(`
      UPDATE UserSessions
      SET RevokedAt = COALESCE(RevokedAt, SYSUTCDATETIME()),
          RevokedReason = COALESCE(RevokedReason, @reason)
      WHERE UserId = @userId
        AND RevokedAt IS NULL
        AND (@exceptSessionId IS NULL OR SessionId <> @exceptSessionId)
    `);
}
