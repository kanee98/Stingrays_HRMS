import { Request, Response } from "express";
import sql from "mssql";
import { poolPromise } from "../config/db";

export const listDeductionRules = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM DeductionRules ORDER BY Name");
    res.json(result.recordset);
  } catch (err) {
    console.error("List deduction rules error:", err);
    res.status(500).json({ error: "Failed to list deduction rules" });
  }
};

export const createDeductionRule = async (req: Request, res: Response) => {
  try {
    const { name, type, defaultValue } = req.body as { name?: string; type?: string; defaultValue?: number };
    if (!name || !type || defaultValue == null) {
      return res.status(400).json({ error: "name, type (percentage|fixed), defaultValue are required" });
    }
    if (type !== "percentage" && type !== "fixed") {
      return res.status(400).json({ error: "type must be percentage or fixed" });
    }
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("name", sql.NVarChar(100), name)
      .input("type", sql.NVarChar(20), type)
      .input("defaultValue", sql.Decimal(18, 2), defaultValue)
      .query(`
        INSERT INTO DeductionRules (Name, Type, DefaultValue)
        OUTPUT INSERTED.Id
        VALUES (@name, @type, @defaultValue)
      `);
    const id = (result.recordset[0] as { Id: number }).Id;
    res.status(201).json({ id, message: "Deduction rule created" });
  } catch (err) {
    console.error("Create deduction rule error:", err);
    res.status(500).json({ error: "Failed to create deduction rule" });
  }
};

export const updateDeductionRule = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const { name, type, defaultValue } = req.body as { name?: string; type?: string; defaultValue?: number };
    const pool = await poolPromise;
    const updates: string[] = [];
    const request = pool.request().input("id", sql.Int, id);
    if (name !== undefined) {
      updates.push("Name = @name");
      request.input("name", sql.NVarChar(100), name);
    }
    if (type !== undefined) {
      if (type !== "percentage" && type !== "fixed") {
        return res.status(400).json({ error: "type must be percentage or fixed" });
      }
      updates.push("Type = @type");
      request.input("type", sql.NVarChar(20), type);
    }
    if (defaultValue !== undefined) {
      updates.push("DefaultValue = @defaultValue");
      request.input("defaultValue", sql.Decimal(18, 2), defaultValue);
    }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    await request.query(`UPDATE DeductionRules SET ${updates.join(", ")} WHERE Id = @id`);
    res.json({ message: "Deduction rule updated" });
  } catch (err) {
    console.error("Update deduction rule error:", err);
    res.status(500).json({ error: "Failed to update deduction rule" });
  }
};

export const deleteDeductionRule = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const pool = await poolPromise;
    await pool.request().input("id", sql.Int, id).query("DELETE FROM DeductionRules WHERE Id = @id");
    res.json({ message: "Deduction rule deleted" });
  } catch (err) {
    console.error("Delete deduction rule error:", err);
    res.status(500).json({ error: "Failed to delete deduction rule" });
  }
};
