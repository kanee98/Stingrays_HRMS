import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { poolPromise } from "../config/db";
import { signToken, verifyToken } from "../utils/paseto";
import { clearSessionCookie, getSessionTokenFromRequest, SESSION_MAX_AGE_MS, setSessionCookie } from "../utils/sessionCookies";

interface SessionUserRow {
  Id: number;
  Email: string;
  Role: string;
}

interface LoginUserRow extends SessionUserRow {
  PasswordHash: string;
}

async function getActiveUserById(userId: number): Promise<SessionUserRow | null> {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("userId", userId)
    .query(`
      SELECT TOP 1 U.Id, U.Email, R.Name AS Role
      FROM Users U
      JOIN UserRoles UR ON U.Id = UR.UserId
      JOIN Roles R ON UR.RoleId = R.Id
      WHERE U.Id = @userId AND U.IsActive = 1
      ORDER BY R.Name
    `);

  return (result.recordset[0] as SessionUserRow | undefined) ?? null;
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("email", email)
      .query(`
        SELECT U.Id, U.Email, U.PasswordHash, R.Name AS Role
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

    const token = await signToken({
        userid: user.Id,
        email: user.Email,
        role: user.Role,
    });

    setSessionCookie(req, res, token);

    res.json({
        expiresIn: Math.floor(SESSION_MAX_AGE_MS / 1000),
        token,
        user: {
            email: user.Email,
            role: user.Role,
        },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSession = async (req: Request, res: Response) => {
  const token = getSessionTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const payload = await verifyToken(token);
    const userId = Number(payload.userid);

    if (!Number.isInteger(userId)) {
      clearSessionCookie(req, res);
      return res.status(401).json({ message: "Invalid session" });
    }

    const user = await getActiveUserById(userId);
    if (!user) {
      clearSessionCookie(req, res);
      return res.status(401).json({ message: "Session expired" });
    }

    return res.json({
      user: {
        email: user.Email,
        role: user.Role,
      },
    });
  } catch (err) {
    clearSessionCookie(req, res);
    return res.status(401).json({ message: "Invalid session" });
  }
};

export const logout = async (req: Request, res: Response) => {
  clearSessionCookie(req, res);
  res.status(204).send();
};
