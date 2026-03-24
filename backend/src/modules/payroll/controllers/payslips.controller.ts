import { Request, Response } from "express";
import sql from "mssql";
import { poolPromise } from "../config/db";
import {
  calculateTotal,
  calculateDeductions,
  calculateTax,
  calculateNetPay,
  type DeductionRuleRow,
  type EmployeeDeductionRow,
  type TaxBracketRow,
} from "../utils/calculatePayslip";

export const listPayslips = async (req: Request, res: Response) => {
  try {
    const payRunId = req.query.payRunId as string | undefined;
    const employeeId = req.query.employeeId as string | undefined;
    const pool = await poolPromise;
    let query = `
      SELECT p.*, e.FirstName, e.LastName, e.Position AS Designation
      FROM Payslips p
      INNER JOIN Employees e ON e.Id = p.EmployeeId AND e.IsActive = 1
      WHERE 1=1
    `;
    const request = pool.request();
    if (payRunId) {
      const id = parseInt(payRunId, 10);
      if (!isNaN(id)) {
        request.input("payRunId", sql.Int, id);
        query += " AND p.PayRunId = @payRunId";
      }
    }
    if (employeeId) {
      const id = parseInt(employeeId, 10);
      if (!isNaN(id)) {
        request.input("employeeId", sql.Int, id);
        query += " AND p.EmployeeId = @employeeId";
      }
    }
    query += " ORDER BY p.Year DESC, p.Month DESC, e.FirstName, e.LastName";
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("List payslips error:", err);
    res.status(500).json({ error: "Failed to list payslips" });
  }
};

export const getPayslip = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid payslip id" });
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT p.*, e.FirstName, e.LastName, e.Position AS Designation
        FROM Payslips p
        INNER JOIN Employees e ON e.Id = p.EmployeeId
        WHERE p.Id = @id
      `);
    if (result.recordset.length === 0) return res.status(404).json({ error: "Payslip not found" });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Get payslip error:", err);
    res.status(500).json({ error: "Failed to get payslip" });
  }
};

async function recalcAndUpdatePayslip(
  pool: sql.ConnectionPool,
  payslipId: number,
  earningFields: {
    basicContractorFee?: number;
    profit121?: number;
    allowances?: number;
    weekendWeekdaysProfitShare?: number;
    ot?: number;
    commission?: number;
    admin?: number;
    outsourced?: number;
    deductions?: number;
  }
) {
  const slipResult = await pool
    .request()
    .input("id", sql.Int, payslipId)
    .query("SELECT * FROM Payslips WHERE Id = @id");
  if (slipResult.recordset.length === 0) return null;
  const slip = slipResult.recordset[0] as Record<string, number>;
  const basicContractorFee = earningFields.basicContractorFee ?? slip.BasicContractorFee ?? 0;
  const profit121 = earningFields.profit121 ?? slip.Profit121 ?? 0;
  const allowances = earningFields.allowances ?? slip.Allowances ?? 0;
  const weekendWeekdaysProfitShare = earningFields.weekendWeekdaysProfitShare ?? slip.WeekendWeekdaysProfitShare ?? 0;
  const ot = earningFields.ot ?? slip.OT ?? 0;
  const commission = earningFields.commission ?? slip.Commission ?? 0;
  const admin = earningFields.admin ?? slip.Admin ?? 0;
  const outsourced = earningFields.outsourced ?? slip.Outsourced ?? 0;
  const total = calculateTotal({
    basicContractorFee,
    profit121,
    allowances,
    weekendWeekdaysProfitShare,
    ot,
    commission,
    admin,
    outsourced,
  });
  const rulesResult = await pool.request().query("SELECT Id, Name, Type, DefaultValue FROM DeductionRules");
  const rules = rulesResult.recordset as DeductionRuleRow[];
  const employeeId = slip.EmployeeId as number;
  const overridesResult = await pool
    .request()
    .input("employeeId", sql.Int, employeeId)
    .query(
      "SELECT DeductionRuleId, OverrideValue FROM EmployeeDeductionOverrides WHERE EmployeeId = @employeeId"
    );
  const overrides = overridesResult.recordset as EmployeeDeductionRow[];
  const deductions = calculateDeductions(total, rules, overrides);
  const bracketsResult = await pool.request().query("SELECT Id, MinAmount, MaxAmount, RatePercent FROM TaxBrackets");
  const brackets = bracketsResult.recordset as TaxBracketRow[];
  const tax = calculateTax(total, brackets);
  const netPay = calculateNetPay(total, deductions, tax);
  await pool
    .request()
    .input("id", sql.Int, payslipId)
    .input("basicContractorFee", sql.Decimal(18, 2), basicContractorFee)
    .input("profit121", sql.Decimal(18, 2), profit121)
    .input("allowances", sql.Decimal(18, 2), allowances)
    .input("weekendWeekdaysProfitShare", sql.Decimal(18, 2), weekendWeekdaysProfitShare)
    .input("ot", sql.Decimal(18, 2), ot)
    .input("commission", sql.Decimal(18, 2), commission)
    .input("admin", sql.Decimal(18, 2), admin)
    .input("outsourced", sql.Decimal(18, 2), outsourced)
    .input("deductions", sql.Decimal(18, 2), deductions)
    .input("total", sql.Decimal(18, 2), total)
    .input("netPay", sql.Decimal(18, 2), netPay)
    .query(`
      UPDATE Payslips SET
        BasicContractorFee = @basicContractorFee,
        Profit121 = @profit121,
        Allowances = @allowances,
        WeekendWeekdaysProfitShare = @weekendWeekdaysProfitShare,
        OT = @ot,
        Commission = @commission,
        Admin = @admin,
        Outsourced = @outsourced,
        Deductions = @deductions,
        Total = @total,
        NetPay = @netPay
      WHERE Id = @id
    `);
  return { total, deductions, tax, netPay };
}

export const createPayslip = async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      payRunId: number;
      employeeId: number;
      month: number;
      year: number;
      workingDays?: number;
      workingHours?: number;
      basicContractorFee?: number;
      profit121?: number;
      allowances?: number;
      weekendWeekdaysProfitShare?: number;
      ot?: number;
      commission?: number;
      admin?: number;
      outsourced?: number;
    };
    const { payRunId, employeeId, month, year } = body;
    if (payRunId == null || employeeId == null || month == null || year == null) {
      return res.status(400).json({ error: "payRunId, employeeId, month, year are required" });
    }
    const pool = await poolPromise;
    const existing = await pool
      .request()
      .input("payRunId", sql.Int, payRunId)
      .input("employeeId", sql.Int, employeeId)
      .query("SELECT Id FROM Payslips WHERE PayRunId = @payRunId AND EmployeeId = @employeeId");
    if (existing.recordset.length > 0) {
      return res.status(400).json({ error: "Payslip for this employee in this pay run already exists" });
    }
    const result = await pool
      .request()
      .input("payRunId", sql.Int, payRunId)
      .input("employeeId", sql.Int, employeeId)
      .input("month", sql.Int, month)
      .input("year", sql.Int, year)
      .input("workingDays", sql.Decimal(10, 2), body.workingDays ?? 0)
      .input("workingHours", sql.Decimal(10, 2), body.workingHours ?? 0)
      .input("basicContractorFee", sql.Decimal(18, 2), body.basicContractorFee ?? 0)
      .input("profit121", sql.Decimal(18, 2), body.profit121 ?? 0)
      .input("allowances", sql.Decimal(18, 2), body.allowances ?? 0)
      .input("weekendWeekdaysProfitShare", sql.Decimal(18, 2), body.weekendWeekdaysProfitShare ?? 0)
      .input("ot", sql.Decimal(18, 2), body.ot ?? 0)
      .input("commission", sql.Decimal(18, 2), body.commission ?? 0)
      .input("admin", sql.Decimal(18, 2), body.admin ?? 0)
      .input("outsourced", sql.Decimal(18, 2), body.outsourced ?? 0)
      .input("deductions", sql.Decimal(18, 2), 0)
      .input("total", sql.Decimal(18, 2), 0)
      .input("netPay", sql.Decimal(18, 2), 0)
      .query(`
        INSERT INTO Payslips (
          PayRunId, EmployeeId, Month, Year, WorkingDays, WorkingHours,
          BasicContractorFee, Profit121, Allowances, WeekendWeekdaysProfitShare,
          OT, Commission, Admin, Outsourced, Deductions, Total, NetPay
        )
        OUTPUT INSERTED.Id
        VALUES (
          @payRunId, @employeeId, @month, @year, @workingDays, @workingHours,
          @basicContractorFee, @profit121, @allowances, @weekendWeekdaysProfitShare,
          @ot, @commission, @admin, @outsourced, @deductions, @total, @netPay
        )
      `);
    const id = (result.recordset[0] as { Id: number }).Id;
    await recalcAndUpdatePayslip(pool, id, {
      basicContractorFee: body.basicContractorFee,
      profit121: body.profit121,
      allowances: body.allowances,
      weekendWeekdaysProfitShare: body.weekendWeekdaysProfitShare,
      ot: body.ot,
      commission: body.commission,
      admin: body.admin,
      outsourced: body.outsourced,
    });
    res.status(201).json({ id, message: "Payslip created" });
  } catch (err) {
    console.error("Create payslip error:", err);
    res.status(500).json({ error: "Failed to create payslip" });
  }
};

export const updatePayslip = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid payslip id" });
    const body = req.body as {
      workingDays?: number;
      workingHours?: number;
      basicContractorFee?: number;
      profit121?: number;
      allowances?: number;
      weekendWeekdaysProfitShare?: number;
      ot?: number;
      commission?: number;
      admin?: number;
      outsourced?: number;
    };
    const pool = await poolPromise;
    if (body.workingDays !== undefined || body.workingHours !== undefined) {
      const updates: string[] = [];
      const request = pool.request().input("id", sql.Int, id);
      if (body.workingDays !== undefined) {
        updates.push("WorkingDays = @workingDays");
        request.input("workingDays", sql.Decimal(10, 2), body.workingDays);
      }
      if (body.workingHours !== undefined) {
        updates.push("WorkingHours = @workingHours");
        request.input("workingHours", sql.Decimal(10, 2), body.workingHours);
      }
      await request.query(`UPDATE Payslips SET ${updates.join(", ")} WHERE Id = @id`);
    }
    await recalcAndUpdatePayslip(pool, id, body);
    const slipResult = await pool.request().input("id", sql.Int, id).query("SELECT * FROM Payslips WHERE Id = @id");
    if (slipResult.recordset.length === 0) return res.status(404).json({ error: "Payslip not found" });
    res.json(slipResult.recordset[0]);
  } catch (err) {
    console.error("Update payslip error:", err);
    res.status(500).json({ error: "Failed to update payslip" });
  }
};

export const deletePayslip = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid payslip id" });
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Payslips WHERE Id = @id; SELECT @@ROWCOUNT AS deleted");
    const deleted = (result.recordset[0] as { deleted: number }).deleted;
    if (deleted === 0) return res.status(404).json({ error: "Payslip not found" });
    res.json({ message: "Payslip deleted" });
  } catch (err) {
    console.error("Delete payslip error:", err);
    res.status(500).json({ error: "Failed to delete payslip" });
  }
};

export const generatePayslipsForPayRun = async (req: Request, res: Response) => {
  try {
    const payRunId = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(payRunId)) return res.status(400).json({ error: "Invalid pay run id" });
    const pool = await poolPromise;
    const runResult = await pool
      .request()
      .input("id", sql.Int, payRunId)
      .query("SELECT Id, Month, Year, Status FROM PayRuns WHERE Id = @id");
    if (runResult.recordset.length === 0) return res.status(404).json({ error: "Pay run not found" });
    const run = runResult.recordset[0] as { Month: number; Year: number; Status: string };
    if (run.Status !== "draft") return res.status(400).json({ error: "Can only generate payslips for draft pay run" });
    const employeesResult = await pool.request().query("SELECT Id FROM Employees WHERE IsActive = 1");
    const employees = employeesResult.recordset as { Id: number }[];
    const existingResult = await pool
      .request()
      .input("payRunId", sql.Int, payRunId)
      .query("SELECT EmployeeId FROM Payslips WHERE PayRunId = @payRunId");
    const existingIds = new Set((existingResult.recordset as { EmployeeId: number }[]).map((r) => r.EmployeeId));
    let created = 0;
    for (const emp of employees) {
      if (existingIds.has(emp.Id)) continue;
      await pool
        .request()
        .input("payRunId", sql.Int, payRunId)
        .input("employeeId", sql.Int, emp.Id)
        .input("month", sql.Int, run.Month)
        .input("year", sql.Int, run.Year)
        .query(`
          INSERT INTO Payslips (
            PayRunId, EmployeeId, Month, Year, WorkingDays, WorkingHours,
            BasicContractorFee, Profit121, Allowances, WeekendWeekdaysProfitShare,
            OT, Commission, Admin, Outsourced, Deductions, Total, NetPay
          )
          VALUES (@payRunId, @employeeId, @month, @year, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        `);
      created++;
    }
    res.json({ message: `Generated ${created} payslips`, created });
  } catch (err) {
    console.error("Generate payslips error:", err);
    res.status(500).json({ error: "Failed to generate payslips" });
  }
};
