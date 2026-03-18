'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@shared/components/Button';
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
} from '../../lib/formatters';
import { primaryActionClasses, secondaryActionClasses } from '@shared/lib/ui';

const API_URL = getPayrollApiUrl();

interface PayRun {
  Id: number;
  Month: number;
  Year: number;
  Status: string;
  CreatedAt: string;
  FinalizedAt: string | null;
}

interface Payslip {
  Id: number;
  PayRunId: number;
  EmployeeId: number;
  Month: number;
  Year: number;
  FirstName: string;
  LastName: string;
  Designation: string | null;
  WorkingDays: number;
  WorkingHours: number;
  BasicContractorFee: number;
  Profit121: number;
  Allowances: number;
  WeekendWeekdaysProfitShare: number;
  OT: number;
  Commission: number;
  Admin: number;
  Outsourced: number;
  Deductions: number;
  Total: number;
  NetPay: number;
}

const editableFields = [
  { key: 'WorkingDays', label: 'Working days' },
  { key: 'WorkingHours', label: 'Working hours' },
  { key: 'BasicContractorFee', label: 'Basic fee' },
  { key: 'Profit121', label: 'Profit 121' },
  { key: 'Allowances', label: 'Allowances' },
  { key: 'WeekendWeekdaysProfitShare', label: 'Weekend / weekday share' },
  { key: 'OT', label: 'Overtime' },
  { key: 'Commission', label: 'Commission' },
  { key: 'Admin', label: 'Admin' },
  { key: 'Outsourced', label: 'Outsourced' },
] as const;

type EditableFieldKey = (typeof editableFields)[number]['key'];

export default function PayRunDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? parseInt(params.id, 10) : NaN;
  const [payRun, setPayRun] = useState<PayRun | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Record<EditableFieldKey, number>>>({});
  const [saving, setSaving] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (Number.isNaN(id)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [runResponse, payslipsResponse] = await Promise.all([
        fetch(`${API_URL}/api/payruns/${id}`),
        fetch(`${API_URL}/api/payslips?payRunId=${id}`),
      ]);

      if (!runResponse.ok) {
        throw new Error('Failed to load pay run');
      }

      if (!payslipsResponse.ok) {
        throw new Error('Failed to load payslips');
      }

      const runPayload = (await runResponse.json()) as PayRun;
      const payslipsPayload = (await payslipsResponse.json()) as Payslip[];

      setPayRun(runPayload);
      setPayslips(Array.isArray(payslipsPayload) ? payslipsPayload : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pay run detail');
      setPayRun(null);
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  const openEdit = (payslip: Payslip) => {
    setEditingId(payslip.Id);
    setEditForm({
      WorkingDays: payslip.WorkingDays,
      WorkingHours: payslip.WorkingHours,
      BasicContractorFee: payslip.BasicContractorFee,
      Profit121: payslip.Profit121,
      Allowances: payslip.Allowances,
      WeekendWeekdaysProfitShare: payslip.WeekendWeekdaysProfitShare,
      OT: payslip.OT,
      Commission: payslip.Commission,
      Admin: payslip.Admin,
      Outsourced: payslip.Outsourced,
    });
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (editingId == null) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${API_URL}/api/payslips/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update payslip');
      }

      closeEdit();
      setNotice('Payslip updated.');
      await fetchDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payslip');
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    return payslips.reduce(
      (accumulator, payslip) => {
        accumulator.total += payslip.Total;
        accumulator.deductions += payslip.Deductions;
        accumulator.netPay += payslip.NetPay;
        return accumulator;
      },
      { total: 0, deductions: 0, netPay: 0 },
    );
  }, [payslips]);

  if (Number.isNaN(id)) {
    return (
      <div className="space-y-6">
        <NoticeBanner tone="error" message="Invalid pay run ID." />
        <Link href="/payruns" className={secondaryActionClasses}>
          Back to pay runs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pay Run Detail"
        title={payRun ? formatMonthYear(payRun.Month, payRun.Year) : `Pay run ${id}`}
        description="Inspect employee-level payroll output and adjust draft payslips from one structured workspace."
        actions={
          <>
            <Link href="/payruns" className={secondaryActionClasses}>
              Back to pay runs
            </Link>
            <Link href="/reports" className={primaryActionClasses}>
              Open reports
            </Link>
          </>
        }
        meta={
          payRun ? (
            <>
              <StatusBadge
                label={formatPayrollStatus(payRun.Status)}
                tone={getPayrollStatusTone(payRun.Status)}
              />
              <span>{payslips.length} payslips in this run</span>
            </>
          ) : undefined
        }
      />

      {error ? <NoticeBanner tone="error" message={error} /> : null}
      {notice ? <NoticeBanner tone="success" message={notice} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Payslips" value={loading ? '...' : payslips.length} helper="Employees included in this run" />
        <MetricCard label="Gross pay" value={loading ? '...' : formatCurrency(totals.total)} helper="Combined pay before deductions" />
        <MetricCard label="Deductions" value={loading ? '...' : formatCurrency(totals.deductions)} helper="Calculated deductions in the run" tone="warning" />
        <MetricCard label="Net pay" value={loading ? '...' : formatCurrency(totals.netPay)} helper="Total payable after deductions" tone="success" />
      </div>

      <SectionCard
        eyebrow="Payslip Directory"
        title="Employee payslips"
        description={
          payRun?.Status === 'draft'
            ? 'Edit draft values inline and the backend will recalculate totals, deductions, and net pay.'
            : 'Finalized runs are read-only records for audit and reporting review.'
        }
      >
        {loading ? (
          <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">
            Loading payslips...
          </div>
        ) : payslips.length === 0 ? (
          <EmptyState
            title="No payslips generated"
            description="Generate payslips from the pay runs page to populate this payroll cycle."
            action={
              <Link href="/payruns" className={primaryActionClasses}>
                Return to pay runs
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-border)] text-[var(--muted)]">
                  <th className="pb-3 pr-4">Employee</th>
                  <th className="pb-3 pr-4">Designation</th>
                  <th className="pb-3 pr-4 text-right">Working days</th>
                  <th className="pb-3 pr-4 text-right">Gross</th>
                  <th className="pb-3 pr-4 text-right">Deductions</th>
                  <th className="pb-3 pr-4 text-right">Net pay</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((payslip) => (
                  <tr key={payslip.Id} className="border-b border-[var(--surface-border)]/70 align-top">
                    {editingId === payslip.Id ? (
                      <td colSpan={7} className="py-4">
                        <div className="rounded-[24px] bg-[var(--surface-muted)] p-5">
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            {editableFields.map((field) => (
                              <div key={field.key}>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                  {field.label}
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm[field.key] ?? ''}
                                  onChange={(event) =>
                                    setEditForm((current) => ({
                                      ...current,
                                      [field.key]: parseFloat(event.target.value) || 0,
                                    }))
                                  }
                                  className="w-full rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <Button type="button" onClick={() => void handleSaveEdit()} disabled={saving}>
                              {saving ? 'Saving...' : 'Save changes'}
                            </Button>
                            <Button type="button" variant="secondary" onClick={closeEdit} disabled={saving}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="py-4 pr-4">
                          <p className="font-medium text-[var(--foreground)]">
                            {[payslip.FirstName, payslip.LastName].filter(Boolean).join(' ') || 'Unnamed employee'}
                          </p>
                        </td>
                        <td className="py-4 pr-4 text-[var(--muted)]">{payslip.Designation || 'Unassigned'}</td>
                        <td className="py-4 pr-4 text-right text-[var(--muted)]">{payslip.WorkingDays}</td>
                        <td className="py-4 pr-4 text-right text-[var(--foreground)]">{formatCurrency(payslip.Total)}</td>
                        <td className="py-4 pr-4 text-right text-[var(--muted)]">{formatCurrency(payslip.Deductions)}</td>
                        <td className="py-4 pr-4 text-right font-semibold text-[var(--foreground)]">{formatCurrency(payslip.NetPay)}</td>
                        <td className="py-4 text-right">
                          {payRun?.Status === 'draft' ? (
                            <button
                              type="button"
                              onClick={() => openEdit(payslip)}
                              className="text-sm font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
                            >
                              Edit
                            </button>
                          ) : (
                            <span className="text-sm text-[var(--muted)]">Read only</span>
                          )}
                        </td>
                      </>
                    )}
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
