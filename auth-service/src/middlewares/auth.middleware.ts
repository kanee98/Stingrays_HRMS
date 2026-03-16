import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/paseto";
import { clearSessionCookie, getSessionTokenFromRequest } from "../utils/sessionCookies";
import { getSessionIdFromPayload, getUserIdFromPayload, isSessionActive, touchSession } from "../services/session.service";

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const token = getSessionTokenFromRequest(req);

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = await verifyToken(token);
        const userId = getUserIdFromPayload(decoded);
        const sessionId = getSessionIdFromPayload(decoded);

        if (userId == null || sessionId == null) {
            clearSessionCookie(req, res);
            return res.status(401).json({ message: "Invalid token" });
        }

        if (!(await isSessionActive(userId, sessionId))) {
            clearSessionCookie(req, res);
            return res.status(401).json({ message: "Session expired" });
        }

        await touchSession(userId, sessionId);
        (req as any).user = decoded;
        next();
    } catch {
        clearSessionCookie(req, res);
        return res.status(401).json({ message: "Invalid token" });
    }
};
