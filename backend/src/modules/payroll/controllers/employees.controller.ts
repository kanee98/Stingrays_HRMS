import { Request, Response } from "express";
import sql from "mssql";
import { poolPromise } from "../config/db";

export const listEmployees = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT Id, FirstName, LastName, Position AS Designation, Department, Email
      FROM Employees
      WHERE IsActive = 1
      ORDER BY FirstName, LastName
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("List employees error:", err);
    res.status(500).json({ error: "Failed to list employees" });
  }
};
