import type { Request } from "express";
import { getSessionIdFromPayload, getUserIdFromPayload, isSessionActive, touchSession } from "./session.service";
import { verifyToken } from "../utils/paseto";
import { getSessionTokensFromRequest } from "../utils/sessionCookies";

export interface AuthenticatedUserSession {
  token: string;
  payload: Record<string, unknown>;
  userId: number;
  sessionId: string;
}

export async function resolveAuthenticatedUserSession(
  req: Request,
  options: { touch?: boolean } = {},
): Promise<AuthenticatedUserSession | null> {
  for (const token of getSessionTokensFromRequest(req)) {
    try {
      const payload = await verifyToken(token);
      const userId = getUserIdFromPayload(payload);
      const sessionId = getSessionIdFromPayload(payload);

      if (userId == null || sessionId == null) {
        continue;
      }

      if (!(await isSessionActive(userId, sessionId))) {
        continue;
      }

      if (options.touch) {
        await touchSession(userId, sessionId);
      }

      return {
        token,
        payload,
        userId,
        sessionId,
      };
    } catch {
      // Try the next candidate token. Browsers can send duplicate cookies during migrations.
    }
  }

  return null;
}
