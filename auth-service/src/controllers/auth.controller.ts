import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { poolPromise } from "../config/db";
import { signToken } from "../utils/paseto";

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

    const user = result.recordset[0];
    const isValid = await bcrypt.compare(password, user.PasswordHash);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = await signToken({
        userid: user.Id,
        email: user.Email,
        role: user.Role,
    });

    res.json({
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