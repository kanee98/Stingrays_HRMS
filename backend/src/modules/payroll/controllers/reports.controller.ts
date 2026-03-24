import { Request, Response } from "express";
import sql from "mssql";
import { poolPromise } from "../config/db";

export const payrollSummary = async (req: Request, res: Response) => {
  try {
    const month = req.query.month as string | undefined;
    const year = req.query.year as string | undefined;
    const pool = await poolPromise;
    let query = `
      SELECT pr.Month, pr.Year, pr.Status,
             COUNT(p.Id) AS PayslipCount,
             ISNULL(SUM(p.Total), 0) AS TotalGross,
             ISNULL(SUM(p.Deductions), 0) AS TotalDeductions,
             ISNULL(SUM(p.NetPay), 0) AS TotalNetPay
      FROM PayRuns pr
      LEFT JOIN Payslips p ON p.PayRunId = pr.Id
      WHERE 1=1
    `;
    const request = pool.request();
    if (month) {
      const m = parseInt(month, 10);
      if (!isNaN(m)) {
        request.input("month", sql.Int, m);
        query += " AND pr.Month = @month";
      }
    }
    if (year) {
      const y = parseInt(year, 10);
      if (!isNaN(y)) {
        request.input("year", sql.Int, y);
        query += " AND pr.Year = @year";
      }
    }
    query += " GROUP BY pr.Id, pr.Month, pr.Year, pr.Status ORDER BY pr.Year DESC, pr.Month DESC";
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Payroll summary error:", err);
    res.status(500).json({ error: "Failed to generate payroll summary" });
  }
};

export const monthlyDetail = async (req: Request, res: Response) => {
  try {
    const month = req.query.month as string | undefined;
    const year = req.query.year as string | undefined;
    if (!month || !year) return res.status(400).json({ error: "month and year query params required" });
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y)) return res.status(400).json({ error: "Invalid month or year" });
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("month", sql.Int, m)
      .input("year", sql.Int, y)
      .query(`
        SELECT p.*, e.FirstName, e.LastName, e.Position AS Designation
        FROM Payslips p
        INNER JOIN Employees e ON e.Id = p.EmployeeId
        INNER JOIN PayRuns pr ON pr.Id = p.PayRunId
        WHERE pr.Month = @month AND pr.Year = @year
        ORDER BY e.FirstName, e.LastName
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Monthly detail error:", err);
    res.status(500).json({ error: "Failed to generate monthly detail" });
  }
};
