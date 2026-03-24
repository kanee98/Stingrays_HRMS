'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@shared/components/Button';
import { EmptyState } from '@shared/components/EmptyState';
import { MetricCard } from '@shared/components/MetricCard';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { StatusBadge } from '@shared/components/StatusBadge';
import { getPayrollApiUrl } from '@shared/lib/appUrls';
import {
  formatDateTime,
  formatMonthYear,
  formatPayrollStatus,
  getPayrollStatusTone,
} from '../lib/formatters';
import { inlineActionClasses, primaryActionClasses, secondaryActionClasses } from '@shared/lib/ui';
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

interface PayRun {
  Id: number;
  Month: number;
  Year: number;
  Status: string;
  CreatedAt: string;
  FinalizedAt: string | null;
}

export default function PayRunsPage() {
  const [runs, setRuns] = useState<PayRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [finalizingId, setFinalizingId] = useState<number | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/payruns`);
      if (!response.ok) {
        throw new Error('Failed to load pay runs');
      }

      const payload = (await response.json()) as PayRun[];
      setRuns(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pay runs');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${API_URL}/api/payruns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create pay run');
      }

      setShowCreate(false);
      setNotice(`Created the ${formatMonthYear(month, year)} pay run.`);
      await fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pay run');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePayslips = async (id: number) => {
    setGeneratingId(id);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${API_URL}/api/payruns/${id}/generate-payslips`, { method: 'POST' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; created?: number };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate payslips');
      }

      setNotice(
        payload.created != null
          ? `Generated ${payload.created} payslips for this pay run.`
          : 'Payslips generated successfully.',
      );
      await fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate payslips');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleFinalize = async (id: number) => {
    setFinalizingId(id);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${API_URL}/api/payruns/${id}/finalize`, { method: 'POST' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to finalize pay run');
      }

      setNotice('Pay run finalized.');
      await fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize pay run');
    } finally {
      setFinalizingId(null);
    }
  };

  const draftCount = runs.filter((run) => run.Status === 'draft').length;
  const finalizedCount = runs.filter((run) => run.Status === 'finalized').length;
  const latestRun = runs[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll Operations"
        title="Pay runs"
        description="Create payroll cycles, generate payslips, and finalize each run using one consistent workflow pattern."
        actions={
          <>
            <button type="button" onClick={() => setShowCreate((current) => !current)} className={primaryActionClasses}>
              {showCreate ? 'Close create panel' : 'New pay run'}
            </button>
            <Link href={payrollPath('/reports')} className={secondaryActionClasses}>
              Open reports
            </Link>
          </>
        }
      />

      {error ? <NoticeBanner tone="error" message={error} /> : null}
      {notice ? <NoticeBanner tone="success" message={notice} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total runs" value={runs.length} helper="Cycles available in payroll" />
        <MetricCard label="Draft runs" value={draftCount} helper="Ready for payslip generation" tone="warning" />
        <MetricCard label="Finalized runs" value={finalizedCount} helper="Closed payroll periods" tone="success" />
        <MetricCard
          label="Latest cycle"
          value={latestRun ? formatMonthYear(latestRun.Month, latestRun.Year) : 'No runs'}
          helper={latestRun ? formatPayrollStatus(latestRun.Status) : 'Create your first payroll cycle'}
          tone="info"
        />
      </div>

      {showCreate ? (
        <SectionCard
          eyebrow="Create Cycle"
          title="Start a new pay run"
          description="Open one payroll cycle per month and year. Duplicate periods are blocked."
        >
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
            <div>
              <label htmlFor="payrun-month" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                Payroll month
              </label>
              <select
                id="payrun-month"
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
              <label htmlFor="payrun-year" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                Payroll year
              </label>
              <input
                id="payrun-year"
                type="number"
                value={year}
                onChange={(event) => setYear(parseInt(event.target.value, 10) || year)}
                min={2020}
                max={2050}
                className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create pay run'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard
        eyebrow="Run Directory"
        title="All pay runs"
        description="Draft runs stay operational until you generate payslips and finalize the cycle."
      >
        {loading ? (
          <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">
            Loading pay runs...
          </div>
        ) : runs.length === 0 ? (
          <EmptyState
            title="No pay runs created"
            description="Create the first payroll cycle to start generating payslips and monthly reports."
            action={
              <button type="button" onClick={() => setShowCreate(true)} className={primaryActionClasses}>
                Create pay run
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-border)] text-[var(--muted)]">
                  <th className="pb-3 pr-4">Cycle</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3 pr-4">Finalized</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.Id} className="border-b border-[var(--surface-border)]/70 align-top">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-[var(--foreground)]">{formatMonthYear(run.Month, run.Year)}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">Pay run ID {run.Id}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <StatusBadge
                        label={formatPayrollStatus(run.Status)}
                        tone={getPayrollStatusTone(run.Status)}
                      />
                    </td>
                    <td className="py-4 pr-4 text-[var(--muted)]">{formatDateTime(run.CreatedAt)}</td>
                    <td className="py-4 pr-4 text-[var(--muted)]">
                      {run.FinalizedAt ? formatDateTime(run.FinalizedAt) : 'Not finalized'}
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link href={payrollPath(`/payruns/${run.Id}`)} className={inlineActionClasses}>
                          View payslips
                        </Link>
                        {run.Status === 'draft' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleGeneratePayslips(run.Id)}
                              disabled={generatingId === run.Id}
                              className={inlineActionClasses}
                            >
                              {generatingId === run.Id ? 'Generating...' : 'Generate payslips'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleFinalize(run.Id)}
                              disabled={finalizingId === run.Id}
                              className={inlineActionClasses}
                            >
                              {finalizingId === run.Id ? 'Finalizing...' : 'Finalize'}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
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
