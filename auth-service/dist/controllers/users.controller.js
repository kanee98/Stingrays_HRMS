"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.listRoles = exports.listUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const mssql_1 = __importDefault(require("mssql"));
const db_1 = require("../config/db");
// GET /api/users - list all users with their roles
const listUsers = async (req, res) => {
    try {
        const pool = await db_1.poolPromise;
        const result = await pool.request().query(`
      SELECT U.Id, U.Email, U.IsActive, U.CreatedAt, R.Name AS RoleName, R.Id AS RoleId
      FROM Users U
      LEFT JOIN UserRoles UR ON U.Id = UR.UserId
      LEFT JOIN Roles R ON UR.RoleId = R.Id
      ORDER BY U.Id
    `);
        const rows = result.recordset;
        const byId = new Map();
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
                byId.get(row.Id).roles.push(row.RoleName);
            }
        }
        res.json(Array.from(byId.values()));
    }
    catch (err) {
        console.error("List users error:", err);
        res.status(500).json({ error: "Failed to list users" });
    }
};
exports.listUsers = listUsers;
// GET /api/roles - list all roles (for dropdowns)
const listRoles = async (req, res) => {
    try {
        const pool = await db_1.poolPromise;
        const result = await pool.request().query("SELECT Id, Name FROM Roles ORDER BY Name");
        res.json(result.recordset);
    }
    catch (err) {
        console.error("List roles error:", err);
        res.status(500).json({ error: "Failed to list roles" });
    }
};
exports.listRoles = listRoles;
// POST /api/users - create user (email, password, roleIds)
const createUser = async (req, res) => {
    try {
        const { email, password, roleIds } = req.body;
        if (!email || typeof email !== "string" || !password || typeof password !== "string") {
            return res.status(400).json({ error: "Email and password are required" });
        }
        const pool = await db_1.poolPromise;
        const existing = await pool.request().input("email", mssql_1.default.NVarChar(255), email).query("SELECT Id FROM Users WHERE Email = @email");
        if (existing.recordset.length > 0) {
            return res.status(400).json({ error: "A user with this email already exists" });
        }
        const hash = await bcrypt_1.default.hash(password, 12);
        const insertResult = await pool
            .request()
            .input("email", mssql_1.default.NVarChar(255), email.trim())
            .input("passwordHash", mssql_1.default.NVarChar(255), hash)
            .input("isActive", mssql_1.default.Bit, 1)
            .query(`
        INSERT INTO Users (Email, PasswordHash, IsActive)
        OUTPUT INSERTED.Id
        VALUES (@email, @passwordHash, @isActive)
      `);
        const userId = insertResult.recordset[0].Id;
        const ids = Array.isArray(roleIds) ? roleIds.filter((r) => Number.isInteger(r)) : [];
        if (ids.length > 0) {
            for (const roleId of ids) {
                await pool
                    .request()
                    .input("userId", mssql_1.default.Int, userId)
                    .input("roleId", mssql_1.default.Int, roleId)
                    .query("INSERT INTO UserRoles (UserId, RoleId) VALUES (@userId, @roleId)");
            }
        }
        res.status(201).json({ id: userId, message: "User created successfully" });
    }
    catch (err) {
        console.error("Create user error:", err);
        res.status(500).json({ error: "Failed to create user" });
    }
};
exports.createUser = createUser;
// PUT /api/users/:id - update user (email, roleIds, isActive)
const updateUser = async (req, res) => {
    try {
        const id = parseInt(String(req.params.id ?? ""), 10);
        if (isNaN(id))
            return res.status(400).json({ error: "Invalid user id" });
        const { email, password, roleIds, isActive } = req.body;
        const pool = await db_1.poolPromise;
        const check = await pool.request().input("id", mssql_1.default.Int, id).query("SELECT Id FROM Users WHERE Id = @id");
        if (check.recordset.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        if (email !== undefined && typeof email === "string") {
            const existing = await pool
                .request()
                .input("email", mssql_1.default.NVarChar(255), email.trim())
                .input("id", mssql_1.default.Int, id)
                .query("SELECT Id FROM Users WHERE Email = @email AND Id <> @id");
            if (existing.recordset.length > 0) {
                return res.status(400).json({ error: "A user with this email already exists" });
            }
            await pool
                .request()
                .input("email", mssql_1.default.NVarChar(255), email.trim())
                .input("id", mssql_1.default.Int, id)
                .query("UPDATE Users SET Email = @email WHERE Id = @id");
        }
        if (password !== undefined && typeof password === "string" && password.length > 0) {
            const hash = await bcrypt_1.default.hash(password, 12);
            await pool
                .request()
                .input("passwordHash", mssql_1.default.NVarChar(255), hash)
                .input("id", mssql_1.default.Int, id)
                .query("UPDATE Users SET PasswordHash = @passwordHash WHERE Id = @id");
        }
        if (isActive !== undefined) {
            const bit = isActive ? 1 : 0;
            await pool
                .request()
                .input("isActive", mssql_1.default.Bit, bit)
                .input("id", mssql_1.default.Int, id)
                .query("UPDATE Users SET IsActive = @isActive WHERE Id = @id");
        }
        if (roleIds !== undefined && Array.isArray(roleIds)) {
            await pool.request().input("userId", mssql_1.default.Int, id).query("DELETE FROM UserRoles WHERE UserId = @userId");
            const ids = roleIds.filter((r) => Number.isInteger(r));
            for (const roleId of ids) {
                await pool
                    .request()
                    .input("userId", mssql_1.default.Int, id)
                    .input("roleId", mssql_1.default.Int, roleId)
                    .query("INSERT INTO UserRoles (UserId, RoleId) VALUES (@userId, @roleId)");
            }
        }
        res.json({ message: "User updated successfully" });
    }
    catch (err) {
        console.error("Update user error:", err);
        res.status(500).json({ error: "Failed to update user" });
    }
};
exports.updateUser = updateUser;
// DELETE /api/users/:id - soft delete (set IsActive = 0)
const deleteUser = async (req, res) => {
    try {
        const id = parseInt(String(req.params.id ?? ""), 10);
        if (isNaN(id))
            return res.status(400).json({ error: "Invalid user id" });
        const pool = await db_1.poolPromise;
        const result = await pool
            .request()
            .input("id", mssql_1.default.Int, id)
            .query(`
        UPDATE Users SET IsActive = 0 WHERE Id = @id;
        SELECT @@ROWCOUNT AS updated
      `);
        const updated = result.recordset[0].updated;
        if (updated === 0)
            return res.status(404).json({ error: "User not found" });
        res.json({ message: "User deleted successfully" });
    }
    catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ error: "Failed to delete user" });
    }
};
exports.deleteUser = deleteUser;
