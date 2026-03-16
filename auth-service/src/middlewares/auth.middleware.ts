import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/paseto";
import { clearSessionCookie, getSessionTokenFromRequest } from "../utils/sessionCookies";

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
        (req as any).user = decoded;
        next();
    } catch {
        clearSessionCookie(req, res);
        return res.status(401).json({ message: "Invalid token" });
    }
};
