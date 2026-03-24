import { Request, Response } from "express";
import sql from "mssql";
import { poolPromise } from "../config/db";

export const listPayRuns = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT Id, Month, Year, Status, CreatedAt, FinalizedAt
      FROM PayRuns
      ORDER BY Year DESC, Month DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("List pay runs error:", err);
    res.status(500).json({ error: "Failed to list pay runs" });
  }
};

export const getPayRun = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid pay run id" });
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM PayRuns WHERE Id = @id");
    if (result.recordset.length === 0) return res.status(404).json({ error: "Pay run not found" });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Get pay run error:", err);
    res.status(500).json({ error: "Failed to get pay run" });
  }
};

export const createPayRun = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.body as { month?: number; year?: number };
    if (month == null || year == null || month < 1 || month > 12) {
      return res.status(400).json({ error: "Valid month (1-12) and year are required" });
    }
    const pool = await poolPromise;
    const existing = await pool
      .request()
      .input("month", sql.Int, month)
      .input("year", sql.Int, year)
      .query("SELECT Id FROM PayRuns WHERE Month = @month AND Year = @year");
    if (existing.recordset.length > 0) {
      return res.status(400).json({ error: "Pay run for this month/year already exists" });
    }
    const result = await pool
      .request()
      .input("month", sql.Int, month)
      .input("year", sql.Int, year)
      .query(`
        INSERT INTO PayRuns (Month, Year, Status)
        OUTPUT INSERTED.Id
        VALUES (@month, @year, 'draft')
      `);
    const id = (result.recordset[0] as { Id: number }).Id;
    res.status(201).json({ id, message: "Pay run created" });
  } catch (err) {
    console.error("Create pay run error:", err);
    res.status(500).json({ error: "Failed to create pay run" });
  }
};

export const finalizePayRun = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid pay run id" });
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE PayRuns SET Status = 'finalized', FinalizedAt = GETDATE() WHERE Id = @id AND Status = 'draft';
        SELECT @@ROWCOUNT AS updated
      `);
    const updated = (result.recordset[0] as { updated: number }).updated;
    if (updated === 0) return res.status(404).json({ error: "Pay run not found or already finalized" });
    res.json({ message: "Pay run finalized" });
  } catch (err) {
    console.error("Finalize pay run error:", err);
    res.status(500).json({ error: "Failed to finalize pay run" });
  }
};

export const deletePayRun = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid pay run id" });
    const pool = await poolPromise;
    const check = await pool.request().input("id", sql.Int, id).query("SELECT Status FROM PayRuns WHERE Id = @id");
    if (check.recordset.length === 0) return res.status(404).json({ error: "Pay run not found" });
    if ((check.recordset[0] as { Status: string }).Status === "finalized") {
      return res.status(400).json({ error: "Cannot delete finalized pay run" });
    }
    await pool.request().input("id", sql.Int, id).query("DELETE FROM PayRuns WHERE Id = @id");
    res.json({ message: "Pay run deleted" });
  } catch (err) {
    console.error("Delete pay run error:", err);
    res.status(500).json({ error: "Failed to delete pay run" });
  }
};
