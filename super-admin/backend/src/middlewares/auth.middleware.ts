import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/paseto";
import { clearSessionCookie, getSessionTokenFromRequest } from "../utils/sessionCookies";

export interface SuperAdminRequest extends Request {
  superAdmin?: {
    adminId: number;
    email: string;
  };
}

export const authenticateSuperAdmin = async (
  req: SuperAdminRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = getSessionTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "No session provided" });
  }

  try {
    const payload = await verifyToken(token);
    const adminId = Number(payload.adminId);
    const email = String(payload.email || "");

    if (!Number.isInteger(adminId) || !email) {
      clearSessionCookie(req, res);
      return res.status(401).json({ message: "Invalid session" });
    }

    req.superAdmin = { adminId, email };
    next();
  } catch {
    clearSessionCookie(req, res);
    return res.status(401).json({ message: "Invalid session" });
  }
};
