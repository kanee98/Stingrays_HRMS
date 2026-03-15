"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../config/db");
const paseto_1 = require("../utils/paseto");
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = await db_1.poolPromise;
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
        const isValid = await bcrypt_1.default.compare(password, user.PasswordHash);
        if (!isValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        const token = await (0, paseto_1.signToken)({
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
    }
    catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.login = login;
