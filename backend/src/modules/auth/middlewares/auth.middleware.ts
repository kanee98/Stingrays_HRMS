import { Request, Response, NextFunction } from "express";
import { clearSessionCookie } from "../utils/sessionCookies";
import { resolveAuthenticatedUserSession } from "../services/requestAuth.service";

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const session = await resolveAuthenticatedUserSession(req, { touch: true });

    if (!session) {
        clearSessionCookie(req, res);
        return res.status(401).json({ message: "Invalid session" });
    }

    (req as Request & { user?: Record<string, unknown> }).user = session.payload;
    next();
};
