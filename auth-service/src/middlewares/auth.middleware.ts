import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/paseto";

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = await verifyToken(token);
        (req as any).user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
};