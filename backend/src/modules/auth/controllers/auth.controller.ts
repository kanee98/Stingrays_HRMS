import { Request, Response } from "express";
import bcrypt from "bcrypt";
import sql from "mssql";
import { poolPromise } from "../config/db";
import { signToken } from "../utils/paseto";
import { clearSessionCookie, SESSION_MAX_AGE_MS, setSessionCookie } from "../utils/sessionCookies";
import {
  createSession,
  revokeSession,
  revokeSessionsForUser,
} from "../services/session.service";
import { resolveAuthenticatedUserSession } from "../services/requestAuth.service";
import { isPasswordReuse, validatePasswordStrength } from "../utils/passwordPolicy";

interface SessionUserRow {
  Id: number;
  Email: string;
  FullName: string | null;
  MustChangePassword: boolean;
  Role: string;
}

interface LoginUserRow extends SessionUserRow {
  PasswordHash: string;
}

function setNoStoreHeaders(res: Response) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function setLogoutResponseHeaders(res: Response) {
  setNoStoreHeaders(res);
  res.setHeader("Clear-Site-Data", "\"cache\", \"storage\"");
}

function normalizeEmailAddress(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function getActiveUserById(userId: number): Promise<SessionUserRow | null> {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("userId", userId)
    .query(`
      SELECT TOP 1 U.Id, U.Email, U.FullName, U.MustChangePassword, R.Name AS Role
      FROM Users U
      JOIN UserRoles UR ON U.Id = UR.UserId
      JOIN Roles R ON UR.RoleId = R.Id
      WHERE U.Id = @userId AND U.IsActive = 1
      ORDER BY R.Name
    `);

  return (result.recordset[0] as SessionUserRow | undefined) ?? null;
}

export const login = async (req: Request, res: Response) => {
  const email = normalizeEmailAddress((req.body as { email?: unknown })?.email);
  const password = typeof (req.body as { password?: unknown })?.password === "string"
    ? (req.body as { password: string }).password
    : "";

  setNoStoreHeaders(res);

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("email", sql.NVarChar(255), email)
      .query(`
        SELECT U.Id, U.Email, U.PasswordHash, R.Name AS Role
             , U.FullName, U.MustChangePassword
        FROM Users U 
        JOIN UserRoles UR ON U.Id = UR.UserId
        JOIN Roles R ON UR.RoleId = R.Id
        WHERE U.Email = @email AND U.IsActive = 1
        `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.recordset[0] as LoginUserRow;
    const isValid = await bcrypt.compare(password, user.PasswordHash);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { sessionId } = await createSession(user.Id, req);
    const token = await signToken({
      userid: user.Id,
      email: user.Email,
      role: user.Role,
      sid: sessionId,
    });

    setSessionCookie(req, res, token);

    res.json({
        expiresIn: Math.floor(SESSION_MAX_AGE_MS / 1000),
        token,
        user: {
            email: user.Email,
            fullName: user.FullName,
            mustChangePassword: Boolean(user.MustChangePassword),
            role: user.Role,
        },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSession = async (req: Request, res: Response) => {
  setNoStoreHeaders(res);
  const session = await resolveAuthenticatedUserSession(req, { touch: true });

  if (!session) {
    clearSessionCookie(req, res);
    return res.status(401).json({ message: "Invalid session" });
  }

  const user = await getActiveUserById(session.userId);
  if (!user) {
    await revokeSession(session.userId, session.sessionId, "user_inactive");
    clearSessionCookie(req, res);
    return res.status(401).json({ message: "Session expired" });
  }

  return res.json({
    user: {
      email: user.Email,
      fullName: user.FullName,
      mustChangePassword: Boolean(user.MustChangePassword),
      role: user.Role,
    },
  });
};

export const logout = async (req: Request, res: Response) => {
  setLogoutResponseHeaders(res);
  const session = await resolveAuthenticatedUserSession(req);

  if (session) {
    await revokeSession(session.userId, session.sessionId, "logout");
  }

  clearSessionCookie(req, res);
  res.status(204).send();
};

export const changePassword = async (req: Request, res: Response) => {
  setNoStoreHeaders(res);
  const authenticatedUserId = Number((req as Request & { user?: Record<string, unknown> }).user?.userid);
  const authenticatedSessionId = (req as Request & { user?: Record<string, unknown> }).user?.sid;
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!Number.isInteger(authenticatedUserId)) {
    clearSessionCookie(req, res);
    return res.status(401).json({ message: "Invalid session" });
  }

  if (!currentPassword || typeof currentPassword !== "string") {
    return res.status(400).json({ message: "Current password is required" });
  }

  if (!newPassword || typeof newPassword !== "string") {
    return res.status(400).json({ message: "New password is required" });
  }

  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  if (isPasswordReuse(currentPassword, newPassword)) {
    return res.status(400).json({ message: "New password must be different from the current password" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, authenticatedUserId)
      .query(`
        SELECT TOP 1 U.Id, U.Email, U.FullName, U.PasswordHash, U.MustChangePassword, R.Name AS Role
        FROM Users U
        JOIN UserRoles UR ON U.Id = UR.UserId
        JOIN Roles R ON UR.RoleId = R.Id
        WHERE U.Id = @userId AND U.IsActive = 1
        ORDER BY R.Name
      `);

    if (result.recordset.length === 0) {
      clearSessionCookie(req, res);
      return res.status(401).json({ message: "Session expired" });
    }

    const user = result.recordset[0] as LoginUserRow;
    const isValid = await bcrypt.compare(currentPassword, user.PasswordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool
      .request()
      .input("userId", sql.Int, authenticatedUserId)
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .query(`
        UPDATE Users
        SET PasswordHash = @passwordHash,
            MustChangePassword = 0,
            PasswordChangedAt = SYSUTCDATETIME(),
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @userId
      `);

    await revokeSessionsForUser(authenticatedUserId, {
      exceptSessionId: typeof authenticatedSessionId === "string" ? authenticatedSessionId : null,
      reason: "password_changed",
    });

    return res.json({
      user: {
        email: user.Email,
        fullName: user.FullName,
        mustChangePassword: false,
        role: user.Role,
      },
    });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ message: "Failed to change password" });
  }
};
