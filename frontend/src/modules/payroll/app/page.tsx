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
import { useAuth } from './contexts/AuthContext';
import {
  formatCount,
  formatCurrency,
  formatMonthYear,
  formatPayrollStatus,
  getPayrollStatusTone,
} from './lib/formatters';
import { primaryActionClasses, secondaryActionClasses } from '@shared/lib/ui';
import { payrollPath } from './lib/routes';

const API_URL = getPayrollApiUrl();

interface PayRun {
  Id: number;
  Month: number;
  Year: number;
  Status: string;
  CreatedAt: string;
  FinalizedAt: string | null;
}

interface SummaryRow {
  Month: number;
  Year: number;
  Status: string;
  PayslipCount: number;
  TotalGross: number;
  TotalDeductions: number;
  TotalNetPay: number;
}

function DashboardIcon({ path }: { path: string }) {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    </svg>
  );
}

export default function PayrollHomePage() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<PayRun[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [runsResponse, summaryResponse] = await Promise.all([
        fetch(`${API_URL}/api/payruns`),
        fetch(`${API_URL}/api/reports/payroll-summary`),
      ]);

      if (!runsResponse.ok) {
        throw new Error('Failed to load pay run overview');
      }

      if (!summaryResponse.ok) {
        throw new Error('Failed to load payroll summary');
      }

      const nextRuns = (await runsResponse.json()) as PayRun[];
      const nextSummary = (await summaryResponse.json()) as SummaryRow[];

      setRuns(Array.isArray(nextRuns) ? nextRuns : []);
      setSummary(Array.isArray(nextSummary) ? nextSummary : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payroll overview');
      setRuns([]);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const latestRun = runs[0] ?? null;
  const draftCount = runs.filter((run) => run.Status === 'draft').length;
  const finalizedCount = runs.filter((run) => run.Status === 'finalized').length;

  const totals = useMemo(() => {
    return summary.reduce(
      (accumulator, row) => {
        accumulator.payslips += row.PayslipCount;
        accumulator.netPay += row.TotalNetPay;
        return accumulator;
      },
      { payslips: 0, netPay: 0 },
    );
  }, [summary]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compensation Operations"
        title="Payroll command center"
        description="Run monthly payroll, monitor draft cycles, and move from configuration to finalized output using the same shared workflow patterns as HRMS and onboarding."
        meta={<span>Signed in as {user?.email ?? 'payroll operator'}</span>}
        actions={
          <>
            <Link href={payrollPath('/payruns')} className={primaryActionClasses}>
              Manage pay runs
            </Link>
            <Link href={payrollPath('/reports')} className={secondaryActionClasses}>
              Open reports
            </Link>
          </>
        }
      />

      {error ? <NoticeBanner tone="error" message={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pay runs"
          value={loading ? '...' : formatCount(runs.length)}
          helper="Monthly payroll cycles on record"
          tone="primary"
          icon={<DashboardIcon path="M4 6h16M4 12h16M4 18h10" />}
        />
        <MetricCard
          label="Draft cycles"
          value={loading ? '...' : formatCount(draftCount)}
          helper="Runs still open for review"
          tone="warning"
          icon={<DashboardIcon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <MetricCard
          label="Finalized cycles"
          value={loading ? '...' : formatCount(finalizedCount)}
          helper="Runs locked and completed"
          tone="success"
          icon={<DashboardIcon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <MetricCard
          label="Net pay processed"
          value={loading ? '...' : formatCurrency(totals.netPay)}
          helper={`${formatCount(totals.payslips)} payslips across recorded cycles`}
          tone="info"
          icon={<DashboardIcon path="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v-1m0-8c1.11 0 2.08.402 2.599 1M9.401 15c.519.598 1.49 1 2.599 1" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <SectionCard
          eyebrow="Current Cycle"
          title="Latest pay run"
          description="Track the current operational state and move quickly into the working pay run."
        >
          {loading ? (
            <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">
              Loading payroll overview...
            </div>
          ) : latestRun ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 rounded-[24px] bg-[var(--surface-muted)] p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Latest run</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {formatMonthYear(latestRun.Month, latestRun.Year)}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Use this cycle as the primary focus for payroll operations, generation, and closeout.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge
                    label={formatPayrollStatus(latestRun.Status)}
                    tone={getPayrollStatusTone(latestRun.Status)}
                  />
                  <Link href={payrollPath(`/payruns/${latestRun.Id}`)} className={primaryActionClasses}>
                    Open run
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Gross pay"
                  value={formatCurrency(summary.find((row) => row.Month === latestRun.Month && row.Year === latestRun.Year)?.TotalGross ?? 0)}
                  helper="Recorded gross compensation"
                  tone="neutral"
                />
                <MetricCard
                  label="Deductions"
                  value={formatCurrency(summary.find((row) => row.Month === latestRun.Month && row.Year === latestRun.Year)?.TotalDeductions ?? 0)}
                  helper="Applicable deductions and withholdings"
                  tone="warning"
                />
                <MetricCard
                  label="Payslips"
                  value={formatCount(summary.find((row) => row.Month === latestRun.Month && row.Year === latestRun.Year)?.PayslipCount ?? 0)}
                  helper="Generated records in this cycle"
                  tone="info"
                />
              </div>
            </div>
          ) : (
            <EmptyState
              title="No payroll cycle exists yet"
              description="Create your first pay run to start processing a monthly payroll cycle."
              action={
                <Link href={payrollPath('/payruns')} className={primaryActionClasses}>
                  Create first pay run
                </Link>
              }
            />
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Workflow"
          title="Next actions"
          description="Keep the same interaction model across payroll, HRMS, and onboarding: clear actions, visible status, and direct paths into the next task."
        >
          <div className="grid gap-3">
            <Link
              href={payrollPath('/payruns')}
              className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-5 py-4 transition hover:border-[var(--primary)] hover:bg-[var(--primary-muted)]"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">Process monthly pay runs</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Create cycles, generate payslips, and finalize the period.</p>
            </Link>
            <Link
              href={payrollPath('/config')}
              className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-5 py-4 transition hover:border-[var(--primary)] hover:bg-[var(--primary-muted)]"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">Review tax and deduction rules</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Maintain payroll logic without leaving the shared workspace shell.</p>
            </Link>
            <Link
              href={payrollPath('/reports')}
              className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-5 py-4 transition hover:border-[var(--primary)] hover:bg-[var(--primary-muted)]"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">Validate reporting outputs</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Compare gross, deductions, and net pay before sign-off.</p>
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
