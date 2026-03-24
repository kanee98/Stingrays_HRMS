import { Request, Response } from "express";
import sql from "mssql";
import { poolPromise } from "../config/db";

export const listTaxBrackets = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM TaxBrackets ORDER BY MinAmount");
    res.json(result.recordset);
  } catch (err) {
    console.error("List tax brackets error:", err);
    res.status(500).json({ error: "Failed to list tax brackets" });
  }
};

export const createTaxBracket = async (req: Request, res: Response) => {
  try {
    const { name, minAmount, maxAmount, ratePercent } = req.body as {
      name?: string;
      minAmount?: number;
      maxAmount?: number;
      ratePercent?: number;
    };
    if (!name || minAmount == null || maxAmount == null || ratePercent == null) {
      return res.status(400).json({ error: "name, minAmount, maxAmount, ratePercent are required" });
    }
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("name", sql.NVarChar(100), name)
      .input("minAmount", sql.Decimal(18, 2), minAmount)
      .input("maxAmount", sql.Decimal(18, 2), maxAmount)
      .input("ratePercent", sql.Decimal(5, 2), ratePercent)
      .query(`
        INSERT INTO TaxBrackets (Name, MinAmount, MaxAmount, RatePercent)
        OUTPUT INSERTED.Id
        VALUES (@name, @minAmount, @maxAmount, @ratePercent)
      `);
    const id = (result.recordset[0] as { Id: number }).Id;
    res.status(201).json({ id, message: "Tax bracket created" });
  } catch (err) {
    console.error("Create tax bracket error:", err);
    res.status(500).json({ error: "Failed to create tax bracket" });
  }
};

export const updateTaxBracket = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const { name, minAmount, maxAmount, ratePercent } = req.body as {
      name?: string;
      minAmount?: number;
      maxAmount?: number;
      ratePercent?: number;
    };
    const pool = await poolPromise;
    const updates: string[] = [];
    const request = pool.request().input("id", sql.Int, id);
    if (name !== undefined) {
      updates.push("Name = @name");
      request.input("name", sql.NVarChar(100), name);
    }
    if (minAmount !== undefined) {
      updates.push("MinAmount = @minAmount");
      request.input("minAmount", sql.Decimal(18, 2), minAmount);
    }
    if (maxAmount !== undefined) {
      updates.push("MaxAmount = @maxAmount");
      request.input("maxAmount", sql.Decimal(18, 2), maxAmount);
    }
    if (ratePercent !== undefined) {
      updates.push("RatePercent = @ratePercent");
      request.input("ratePercent", sql.Decimal(5, 2), ratePercent);
    }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    await request.query(`UPDATE TaxBrackets SET ${updates.join(", ")} WHERE Id = @id`);
    res.json({ message: "Tax bracket updated" });
  } catch (err) {
    console.error("Update tax bracket error:", err);
    res.status(500).json({ error: "Failed to update tax bracket" });
  }
};

export const deleteTaxBracket = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const pool = await poolPromise;
    await pool.request().input("id", sql.Int, id).query("DELETE FROM TaxBrackets WHERE Id = @id");
    res.json({ message: "Tax bracket deleted" });
  } catch (err) {
    console.error("Delete tax bracket error:", err);
    res.status(500).json({ error: "Failed to delete tax bracket" });
  }
};
