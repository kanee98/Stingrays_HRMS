'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@shared/components/EmptyState';
import { MetricCard } from '@shared/components/MetricCard';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { StatusBadge } from '@shared/components/StatusBadge';
import { getPayrollApiUrl } from '@shared/lib/appUrls';
import {
  formatCurrency,
  formatMonthYear,
  formatPayrollStatus,
  getPayrollStatusTone,
} from '../lib/formatters';
import { primaryActionClasses, secondaryActionClasses } from '@shared/lib/ui';
import { payrollPath } from '../lib/routes';

const API_URL = getPayrollApiUrl();
const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

interface SummaryRow {
  Month: number;
  Year: number;
  Status: string;
  PayslipCount: number;
  TotalGross: number;
  TotalDeductions: number;
  TotalNetPay: number;
}

interface MonthlyDetailRow {
  Id: number;
  FirstName: string | null;
  LastName: string | null;
  Designation: string | null;
  Total: number;
  Deductions: number;
  NetPay: number;
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [detail, setDetail] = useState<MonthlyDetailRow[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/reports/payroll-summary`);
      if (!response.ok) {
        throw new Error('Failed to load payroll summary');
      }

      const payload = (await response.json()) as SummaryRow[];
      setSummary(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payroll summary');
      setSummary([]);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchMonthlyDetail = useCallback(async () => {
    try {
      setLoadingDetail(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/reports/monthly-detail?month=${month}&year=${year}`);
      if (!response.ok) {
        throw new Error('Failed to load monthly detail');
      }

      const payload = (await response.json()) as MonthlyDetailRow[];
      setDetail(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monthly detail');
      setDetail([]);
    } finally {
      setLoadingDetail(false);
    }
  }, [month, year]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    void fetchMonthlyDetail();
  }, [fetchMonthlyDetail]);

  const totals = useMemo(() => {
    return summary.reduce(
      (accumulator, row) => {
        accumulator.runs += 1;
        accumulator.payslips += row.PayslipCount;
        accumulator.netPay += row.TotalNetPay;
        accumulator.gross += row.TotalGross;
        return accumulator;
      },
      { runs: 0, payslips: 0, netPay: 0, gross: 0 },
    );
  }, [summary]);

  const selectedSummary = summary.find((row) => row.Month === month && row.Year === year) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll Intelligence"
        title="Reports"
        description="Review payroll outcomes with the same information architecture used across the platform: clear summaries, structured filters, and actionable detail tables."
        actions={
          <>
            <Link href={payrollPath('/payruns')} className={primaryActionClasses}>
              Open pay runs
            </Link>
            <Link href={payrollPath('/config')} className={secondaryActionClasses}>
              Review config
            </Link>
          </>
        }
      />

      {error ? <NoticeBanner tone="error" message={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Reported cycles" value={loadingSummary ? '...' : totals.runs} helper="Payroll periods included in reporting" />
        <MetricCard label="Payslips" value={loadingSummary ? '...' : totals.payslips} helper="Combined payslips across reported cycles" tone="info" />
        <MetricCard label="Gross pay" value={loadingSummary ? '...' : formatCurrency(totals.gross)} helper="Reported before deductions" tone="primary" />
        <MetricCard label="Net pay" value={loadingSummary ? '...' : formatCurrency(totals.netPay)} helper="Paid after deductions and tax" tone="success" />
      </div>

      <SectionCard
        eyebrow="Summary"
        title="Payroll summary"
        description="A period-by-period view of gross, deductions, and net pay."
      >
        {loadingSummary ? (
          <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">
            Loading payroll summary...
          </div>
        ) : summary.length === 0 ? (
          <EmptyState
            title="No payroll reporting available"
            description="Create and process pay runs before summary reporting can populate."
            action={
              <Link href={payrollPath('/payruns')} className={primaryActionClasses}>
                Go to pay runs
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-border)] text-[var(--muted)]">
                  <th className="pb-3 pr-4">Cycle</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4 text-right">Payslips</th>
                  <th className="pb-3 pr-4 text-right">Gross</th>
                  <th className="pb-3 pr-4 text-right">Deductions</th>
                  <th className="pb-3 text-right">Net pay</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={`${row.Year}-${row.Month}`} className="border-b border-[var(--surface-border)]/70">
                    <td className="py-4 pr-4 font-medium text-[var(--foreground)]">{formatMonthYear(row.Month, row.Year)}</td>
                    <td className="py-4 pr-4">
                      <StatusBadge
                        label={formatPayrollStatus(row.Status)}
                        tone={getPayrollStatusTone(row.Status)}
                      />
                    </td>
                    <td className="py-4 pr-4 text-right text-[var(--muted)]">{row.PayslipCount}</td>
                    <td className="py-4 pr-4 text-right text-[var(--foreground)]">{formatCurrency(row.TotalGross)}</td>
                    <td className="py-4 pr-4 text-right text-[var(--muted)]">{formatCurrency(row.TotalDeductions)}</td>
                    <td className="py-4 text-right font-semibold text-[var(--foreground)]">{formatCurrency(row.TotalNetPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Monthly Detail"
        title="Employee-level detail"
        description="Adjust the month and year to inspect who was paid and the value of each payslip."
      >
        <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
          <div>
            <label htmlFor="detail-month" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
              Month
            </label>
            <select
              id="detail-month"
              value={month}
              onChange={(event) => setMonth(parseInt(event.target.value, 10))}
              className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="detail-year" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
              Year
            </label>
            <input
              id="detail-year"
              type="number"
              value={year}
              onChange={(event) => setYear(parseInt(event.target.value, 10) || year)}
              min={2020}
              max={2050}
              className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
            />
          </div>
          <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Selected period</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{formatMonthYear(month, year)}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {selectedSummary ? formatPayrollStatus(selectedSummary.Status) : 'No summary recorded yet'}
            </p>
          </div>
        </div>

        {loadingDetail ? (
          <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">
            Loading monthly detail...
          </div>
        ) : detail.length === 0 ? (
          <EmptyState
            title="No employee detail for this period"
            description="Generate payslips for the selected month and year to populate the detailed payroll view."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-border)] text-[var(--muted)]">
                  <th className="pb-3 pr-4">Employee</th>
                  <th className="pb-3 pr-4">Designation</th>
                  <th className="pb-3 pr-4 text-right">Gross</th>
                  <th className="pb-3 pr-4 text-right">Deductions</th>
                  <th className="pb-3 text-right">Net pay</th>
                </tr>
              </thead>
              <tbody>
                {detail.map((row) => (
                  <tr key={row.Id} className="border-b border-[var(--surface-border)]/70">
                    <td className="py-4 pr-4 font-medium text-[var(--foreground)]">
                      {[row.FirstName, row.LastName].filter(Boolean).join(' ') || 'Unnamed employee'}
                    </td>
                    <td className="py-4 pr-4 text-[var(--muted)]">{row.Designation || 'Unassigned'}</td>
                    <td className="py-4 pr-4 text-right text-[var(--foreground)]">{formatCurrency(row.Total)}</td>
                    <td className="py-4 pr-4 text-right text-[var(--muted)]">{formatCurrency(row.Deductions)}</td>
                    <td className="py-4 text-right font-semibold text-[var(--foreground)]">{formatCurrency(row.NetPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
