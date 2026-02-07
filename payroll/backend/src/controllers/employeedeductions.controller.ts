import { Request, Response } from "express";
import sql from "mssql";
import { poolPromise } from "../config/db";

export const getByEmployee = async (req: Request, res: Response) => {
  try {
    const employeeId = parseInt(String(req.params.employeeId ?? ""), 10);
    if (isNaN(employeeId)) return res.status(400).json({ error: "Invalid employee id" });
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("employeeId", sql.Int, employeeId)
      .query(`
        SELECT dr.Id AS DeductionRuleId, dr.Name, dr.Type, dr.DefaultValue,
               ISNULL(edo.OverrideValue, dr.DefaultValue) AS EffectiveValue
        FROM DeductionRules dr
        LEFT JOIN EmployeeDeductionOverrides edo ON edo.DeductionRuleId = dr.Id AND edo.EmployeeId = @employeeId
        ORDER BY dr.Name
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Get employee deductions error:", err);
    res.status(500).json({ error: "Failed to get employee deductions" });
  }
};

export const upsertOverrides = async (req: Request, res: Response) => {
  try {
    const employeeId = parseInt(String(req.params.employeeId ?? ""), 10);
    if (isNaN(employeeId)) return res.status(400).json({ error: "Invalid employee id" });
    const { overrides } = req.body as { overrides?: { deductionRuleId: number; overrideValue: number }[] };
    if (!Array.isArray(overrides)) return res.status(400).json({ error: "overrides array is required" });
    const pool = await poolPromise;
    await pool.request().input("employeeId", sql.Int, employeeId).query(
      "DELETE FROM EmployeeDeductionOverrides WHERE EmployeeId = @employeeId"
    );
    for (const o of overrides) {
      if (o.deductionRuleId == null || o.overrideValue == null) continue;
      await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .input("deductionRuleId", sql.Int, o.deductionRuleId)
        .input("overrideValue", sql.Decimal(18, 2), o.overrideValue)
        .query(`
          INSERT INTO EmployeeDeductionOverrides (EmployeeId, DeductionRuleId, OverrideValue)
          VALUES (@employeeId, @deductionRuleId, @overrideValue)
        `);
    }
    res.json({ message: "Employee deduction overrides updated" });
  } catch (err) {
    console.error("Upsert employee deductions error:", err);
    res.status(500).json({ error: "Failed to update employee deductions" });
  }
};
