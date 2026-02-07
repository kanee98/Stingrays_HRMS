/**
 * Compute Total (gross), Deductions, Tax, NetPay for a payslip.
 * Total = sum of all earning components.
 * Deductions = sum of per-employee deduction overrides (or rule defaults); percentage rules apply to Total.
 * Tax = from TaxBrackets (bracket where Total falls; single bracket lookup).
 * NetPay = Total - Deductions - Tax.
 */

export interface EarningInput {
  basicContractorFee: number;
  profit121: number;
  allowances: number;
  weekendWeekdaysProfitShare: number;
  ot: number;
  commission: number;
  admin: number;
  outsourced: number;
}

export interface DeductionRuleRow {
  Id: number;
  Name: string;
  Type: "percentage" | "fixed";
  DefaultValue: number;
}

export interface EmployeeDeductionRow {
  DeductionRuleId: number;
  OverrideValue: number;
}

export interface TaxBracketRow {
  Id: number;
  MinAmount: number;
  MaxAmount: number;
  RatePercent: number;
}

export function calculateTotal(earnings: EarningInput): number {
  return (
    (earnings.basicContractorFee ?? 0) +
    (earnings.profit121 ?? 0) +
    (earnings.allowances ?? 0) +
    (earnings.weekendWeekdaysProfitShare ?? 0) +
    (earnings.ot ?? 0) +
    (earnings.commission ?? 0) +
    (earnings.admin ?? 0) +
    (earnings.outsourced ?? 0)
  );
}

export function calculateDeductions(
  total: number,
  rules: DeductionRuleRow[],
  overrides: EmployeeDeductionRow[]
): number {
  let sum = 0;
  const overrideMap = new Map(overrides.map((o) => [o.DeductionRuleId, o.OverrideValue]));
  for (const rule of rules) {
    const value = overrideMap.has(rule.Id) ? overrideMap.get(rule.Id)! : rule.DefaultValue;
    if (rule.Type === "percentage") {
      sum += (total * value) / 100;
    } else {
      sum += value;
    }
  }
  return Math.round(sum * 100) / 100;
}

export function calculateTax(total: number, brackets: TaxBracketRow[]): number {
  const sorted = [...brackets].sort((a, b) => a.MinAmount - b.MinAmount);
  for (const b of sorted) {
    if (total >= b.MinAmount && total <= b.MaxAmount) {
      return Math.round((total * b.RatePercent) / 100 * 100) / 100;
    }
  }
  return 0;
}

export function calculateNetPay(total: number, deductions: number, tax: number): number {
  return Math.round((total - deductions - tax) * 100) / 100;
}
