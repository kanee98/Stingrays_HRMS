import type { Request } from "express";
import { verifyToken } from "../utils/paseto";
import { getSessionTokensFromRequest } from "../utils/sessionCookies";
import { getAdminIdFromPayload, getSessionIdFromPayload, isSessionActive, touchSession } from "./session.service";

export interface AuthenticatedSuperAdminSession {
  token: string;
  payload: Record<string, unknown>;
  adminId: number;
  sessionId: string;
  email: string;
}

export async function resolveAuthenticatedSuperAdminSession(
  req: Request,
  options: { touch?: boolean } = {},
): Promise<AuthenticatedSuperAdminSession | null> {
  for (const token of getSessionTokensFromRequest(req)) {
    try {
      const payload = await verifyToken(token);
      const adminId = getAdminIdFromPayload(payload);
      const sessionId = getSessionIdFromPayload(payload);
      const email = typeof payload.email === "string" ? payload.email.trim() : "";

      if (adminId == null || sessionId == null || !email) {
        continue;
      }

      if (!(await isSessionActive(adminId, sessionId))) {
        continue;
      }

      if (options.touch) {
        await touchSession(adminId, sessionId);
      }

      return {
        token,
        payload,
        adminId,
        sessionId,
        email,
      };
    } catch {
      // Try the next candidate token. Browsers can send duplicate cookies during migrations.
    }
  }

  return null;
}
