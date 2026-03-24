import { Request, Response } from "express";
import bcrypt from "bcrypt";
import sql from "mssql";
import { poolPromise } from "../config/db";

// GET /api/users - list all users with their roles
export const listUsers = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT U.Id, U.Email, U.IsActive, U.CreatedAt, R.Name AS RoleName, R.Id AS RoleId
      FROM Users U
      LEFT JOIN UserRoles UR ON U.Id = UR.UserId
      LEFT JOIN Roles R ON UR.RoleId = R.Id
      ORDER BY U.Id
    `);

    const rows = result.recordset as { Id: number; Email: string; IsActive: boolean; CreatedAt: Date; RoleName: string | null; RoleId: number | null }[];
    const byId = new Map<number, { Id: number; Email: string; IsActive: boolean; CreatedAt: string; roles: string[] }>();

    for (const row of rows) {
      if (!byId.has(row.Id)) {
        byId.set(row.Id, {
          Id: row.Id,
          Email: row.Email,
          IsActive: row.IsActive,
          CreatedAt: row.CreatedAt ? new Date(row.CreatedAt).toISOString() : "",
          roles: [],
        });
      }
      if (row.RoleName) {
        byId.get(row.Id)!.roles.push(row.RoleName);
      }
    }

    res.json(Array.from(byId.values()));
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
};

// GET /api/roles - list all roles (for dropdowns)
export const listRoles = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT Id, Name FROM Roles ORDER BY Name");
    res.json(result.recordset);
  } catch (err) {
    console.error("List roles error:", err);
    res.status(500).json({ error: "Failed to list roles" });
  }
};

// POST /api/users - create user (email, password, roleIds)
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, roleIds } = req.body as { email?: string; password?: string; roleIds?: number[] };
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const pool = await poolPromise;

    const existing = await pool.request().input("email", sql.NVarChar(255), email).query(
      "SELECT Id FROM Users WHERE Email = @email"
    );
    if (existing.recordset.length > 0) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const hash = await bcrypt.hash(password, 12);
    const insertResult = await pool
      .request()
      .input("email", sql.NVarChar(255), email.trim())
      .input("passwordHash", sql.NVarChar(255), hash)
      .input("isActive", sql.Bit, 1)
      .query(`
        INSERT INTO Users (Email, PasswordHash, IsActive)
        OUTPUT INSERTED.Id
        VALUES (@email, @passwordHash, @isActive)
      `);

    const userId = (insertResult.recordset[0] as { Id: number }).Id;
    const ids = Array.isArray(roleIds) ? roleIds.filter((r) => Number.isInteger(r)) : [];
    if (ids.length > 0) {
      for (const roleId of ids) {
        await pool
          .request()
          .input("userId", sql.Int, userId)
          .input("roleId", sql.Int, roleId)
          .query("INSERT INTO UserRoles (UserId, RoleId) VALUES (@userId, @roleId)");
      }
    }

    res.status(201).json({ id: userId, message: "User created successfully" });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
};

// PUT /api/users/:id - update user (email, roleIds, isActive)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid user id" });

    const { email, password, roleIds, isActive } = req.body as {
      email?: string;
      password?: string;
      roleIds?: number[];
      isActive?: boolean;
    };

    const pool = await poolPromise;

    const check = await pool.request().input("id", sql.Int, id).query("SELECT Id FROM Users WHERE Id = @id");
    if (check.recordset.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (email !== undefined && typeof email === "string") {
      const existing = await pool
        .request()
        .input("email", sql.NVarChar(255), email.trim())
        .input("id", sql.Int, id)
        .query("SELECT Id FROM Users WHERE Email = @email AND Id <> @id");
      if (existing.recordset.length > 0) {
        return res.status(400).json({ error: "A user with this email already exists" });
      }
      await pool
        .request()
        .input("email", sql.NVarChar(255), email.trim())
        .input("id", sql.Int, id)
        .query("UPDATE Users SET Email = @email WHERE Id = @id");
    }

    if (password !== undefined && typeof password === "string" && password.length > 0) {
      const hash = await bcrypt.hash(password, 12);
      await pool
        .request()
        .input("passwordHash", sql.NVarChar(255), hash)
        .input("id", sql.Int, id)
        .query("UPDATE Users SET PasswordHash = @passwordHash WHERE Id = @id");
    }

    if (isActive !== undefined) {
      const bit = isActive ? 1 : 0;
      await pool
        .request()
        .input("isActive", sql.Bit, bit)
        .input("id", sql.Int, id)
        .query("UPDATE Users SET IsActive = @isActive WHERE Id = @id");
    }

    if (roleIds !== undefined && Array.isArray(roleIds)) {
      await pool.request().input("userId", sql.Int, id).query("DELETE FROM UserRoles WHERE UserId = @userId");
      const ids = roleIds.filter((r) => Number.isInteger(r)) as number[];
      for (const roleId of ids) {
        await pool
          .request()
          .input("userId", sql.Int, id)
          .input("roleId", sql.Int, roleId)
          .query("INSERT INTO UserRoles (UserId, RoleId) VALUES (@userId, @roleId)");
      }
    }

    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
};

// DELETE /api/users/:id - soft delete (set IsActive = 0)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid user id" });

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE Users SET IsActive = 0 WHERE Id = @id;
        SELECT @@ROWCOUNT AS updated
      `);

    const updated = (result.recordset[0] as { updated: number }).updated;
    if (updated === 0) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
};
