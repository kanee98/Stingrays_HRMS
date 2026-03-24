import { NextFunction, Request, Response } from "express";
import { clearSessionCookie } from "../utils/sessionCookies";
import { resolveAuthenticatedSuperAdminSession } from "../services/requestAuth.service";

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
  const session = await resolveAuthenticatedSuperAdminSession(req, { touch: true });
  if (!session) {
    clearSessionCookie(req, res);
    return res.status(401).json({ message: "No session provided" });
  }

  req.superAdmin = { adminId: session.adminId, email: session.email };
  next();
};
