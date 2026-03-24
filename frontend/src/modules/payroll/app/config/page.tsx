'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@shared/components/Button';
import { EmptyState } from '@shared/components/EmptyState';
import { MetricCard } from '@shared/components/MetricCard';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { getPayrollApiUrl } from '@shared/lib/appUrls';
import { formatCurrency } from '../lib/formatters';
import { inlineActionClasses, primaryActionClasses, secondaryActionClasses } from '@shared/lib/ui';

const API_URL = getPayrollApiUrl();

interface TaxBracket {
  Id: number;
  Name: string;
  MinAmount: number;
  MaxAmount: number;
  RatePercent: number;
}

interface DeductionRule {
  Id: number;
  Name: string;
  Type: 'percentage' | 'fixed';
  DefaultValue: number;
}

export default function ConfigPage() {
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [deductionRules, setDeductionRules] = useState<DeductionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<'tax' | 'deductions'>('tax');

  const fetchTax = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/taxbrackets`);
    if (!response.ok) {
      throw new Error('Failed to load tax brackets');
    }

    const payload = (await response.json()) as TaxBracket[];
    setTaxBrackets(Array.isArray(payload) ? payload : []);
  }, []);

  const fetchDeductions = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/deductionrules`);
    if (!response.ok) {
      throw new Error('Failed to load deduction rules');
    }

    const payload = (await response.json()) as DeductionRule[];
    setDeductionRules(Array.isArray(payload) ? payload : []);
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchTax(), fetchDeductions()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payroll configuration');
      setTaxBrackets([]);
      setDeductionRules([]);
    } finally {
      setLoading(false);
    }
  }, [fetchTax, fetchDeductions]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const totalTaxCoverage = taxBrackets.reduce((sum, bracket) => sum + bracket.RatePercent, 0);
  const percentageRules = deductionRules.filter((rule) => rule.Type === 'percentage').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll Rules"
        title="Configuration"
        description="Manage tax brackets and deduction rules using the same structured admin patterns used across the rest of the platform."
      />

      {error ? <NoticeBanner tone="error" message={error} /> : null}
      {notice ? <NoticeBanner tone="success" message={notice} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tax brackets" value={taxBrackets.length} helper="Configured payroll tax ranges" />
        <MetricCard label="Deduction rules" value={deductionRules.length} helper="Reusable deduction definitions" tone="info" />
        <MetricCard label="Percentage rules" value={percentageRules} helper="Rules that scale with pay value" tone="warning" />
        <MetricCard label="Tax rate coverage" value={`${totalTaxCoverage.toFixed(2)}%`} helper="Combined headline rates across brackets" tone="success" />
      </div>

      <SectionCard
        eyebrow="Rule Sets"
        title="Manage payroll logic"
        description="Switch between tax brackets and deduction rules without leaving the shared layout or interaction model."
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTab('tax')}
            className={tab === 'tax' ? primaryActionClasses : secondaryActionClasses}
          >
            Tax brackets
          </button>
          <button
            type="button"
            onClick={() => setTab('deductions')}
            className={tab === 'deductions' ? primaryActionClasses : secondaryActionClasses}
          >
            Deduction rules
          </button>
        </div>
      </SectionCard>

      {loading ? (
        <SectionCard>
          <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">
            Loading payroll configuration...
          </div>
        </SectionCard>
      ) : tab === 'tax' ? (
        <TaxBracketsSection
          brackets={taxBrackets}
          onRefresh={fetchTax}
          onError={setError}
          onNotice={setNotice}
        />
      ) : (
        <DeductionRulesSection
          rules={deductionRules}
          onRefresh={fetchDeductions}
          onError={setError}
          onNotice={setNotice}
        />
      )}
    </div>
  );
}

function TaxBracketsSection({
  brackets,
  onRefresh,
  onError,
  onNotice,
}: {
  brackets: TaxBracket[];
  onRefresh: () => Promise<void>;
  onError: (value: string | null) => void;
  onNotice: (value: string | null) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(100000);
  const [ratePercent, setRatePercent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setMinAmount(0);
    setMaxAmount(100000);
    setRatePercent(0);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    onError(null);
    onNotice(null);

    try {
      const response = await fetch(
        editingId == null ? `${API_URL}/api/taxbrackets` : `${API_URL}/api/taxbrackets/${editingId}`,
        {
          method: editingId == null ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, minAmount, maxAmount, ratePercent }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save tax bracket');
      }

      onNotice(editingId == null ? 'Tax bracket created.' : 'Tax bracket updated.');
      resetForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save tax bracket');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this tax bracket?')) {
      return;
    }

    setDeletingId(id);
    onError(null);
    onNotice(null);

    try {
      const response = await fetch(`${API_URL}/api/taxbrackets/${id}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete tax bracket');
      }

      if (editingId === id) {
        resetForm();
      }

      onNotice('Tax bracket deleted.');
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete tax bracket');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (bracket: TaxBracket) => {
    setEditingId(bracket.Id);
    setName(bracket.Name);
    setMinAmount(bracket.MinAmount);
    setMaxAmount(bracket.MaxAmount);
    setRatePercent(bracket.RatePercent);
    onError(null);
    onNotice(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.4fr)]">
      <SectionCard
        eyebrow="Tax Brackets"
        title={editingId == null ? 'Add tax bracket' : 'Edit tax bracket'}
        description="Define the income band and applicable rate for payroll calculations."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tax-name" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
              Bracket name
            </label>
            <input
              id="tax-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tax-min" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                Minimum amount
              </label>
              <input
                id="tax-min"
                type="number"
                step="0.01"
                value={minAmount}
                onChange={(event) => setMinAmount(parseFloat(event.target.value) || 0)}
                className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
              />
            </div>
            <div>
              <label htmlFor="tax-max" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                Maximum amount
              </label>
              <input
                id="tax-max"
                type="number"
                step="0.01"
                value={maxAmount}
                onChange={(event) => setMaxAmount(parseFloat(event.target.value) || 0)}
                className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
              />
            </div>
          </div>
          <div>
            <label htmlFor="tax-rate" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
              Rate percent
            </label>
            <input
              id="tax-rate"
              type="number"
              step="0.01"
              value={ratePercent}
              onChange={(event) => setRatePercent(parseFloat(event.target.value) || 0)}
              className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId == null ? 'Add tax bracket' : 'Save changes'}
            </Button>
            {editingId != null ? (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        eyebrow="Reference Table"
        title="Tax bracket list"
        description="Review, edit, or remove tax brackets currently used in payroll calculations."
      >
        {brackets.length === 0 ? (
          <EmptyState title="No tax brackets" description="Add a tax bracket to define payroll tax behavior." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-border)] text-[var(--muted)]">
                  <th className="pb-3 pr-4">Bracket</th>
                  <th className="pb-3 pr-4">Range</th>
                  <th className="pb-3 pr-4 text-right">Rate</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {brackets.map((bracket) => (
                  <tr key={bracket.Id} className="border-b border-[var(--surface-border)]/70">
                    <td className="py-4 pr-4 font-medium text-[var(--foreground)]">{bracket.Name}</td>
                    <td className="py-4 pr-4 text-[var(--muted)]">
                      {formatCurrency(bracket.MinAmount)} to {formatCurrency(bracket.MaxAmount)}
                    </td>
                    <td className="py-4 pr-4 text-right text-[var(--foreground)]">{bracket.RatePercent}%</td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => handleEdit(bracket)} className={inlineActionClasses}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(bracket.Id)}
                          disabled={deletingId === bracket.Id}
                          className="text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === bracket.Id ? 'Deleting...' : 'Delete'}
                        </button>
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

function DeductionRulesSection({
  rules,
  onRefresh,
  onError,
  onNotice,
}: {
  rules: DeductionRule[];
  onRefresh: () => Promise<void>;
  onError: (value: string | null) => void;
  onNotice: (value: string | null) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('fixed');
  const [defaultValue, setDefaultValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setType('fixed');
    setDefaultValue(0);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    onError(null);
    onNotice(null);

    try {
      const response = await fetch(
        editingId == null ? `${API_URL}/api/deductionrules` : `${API_URL}/api/deductionrules/${editingId}`,
        {
          method: editingId == null ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, type, defaultValue }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save deduction rule');
      }

      onNotice(editingId == null ? 'Deduction rule created.' : 'Deduction rule updated.');
      resetForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save deduction rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this deduction rule?')) {
      return;
    }

    setDeletingId(id);
    onError(null);
    onNotice(null);

    try {
      const response = await fetch(`${API_URL}/api/deductionrules/${id}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete deduction rule');
      }

      if (editingId === id) {
        resetForm();
      }

      onNotice('Deduction rule deleted.');
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete deduction rule');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (rule: DeductionRule) => {
    setEditingId(rule.Id);
    setName(rule.Name);
    setType(rule.Type);
    setDefaultValue(rule.DefaultValue);
    onError(null);
    onNotice(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.4fr)]">
      <SectionCard
        eyebrow="Deduction Rules"
        title={editingId == null ? 'Add deduction rule' : 'Edit deduction rule'}
        description="Define reusable deduction rules as fixed amounts or percentages."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="deduction-name" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
              Rule name
            </label>
            <input
              id="deduction-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="deduction-type" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                Rule type
              </label>
              <select
                id="deduction-type"
                value={type}
                onChange={(event) => setType(event.target.value as 'percentage' | 'fixed')}
                className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
              >
                <option value="fixed">Fixed amount</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div>
              <label htmlFor="deduction-default" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                Default value
              </label>
              <input
                id="deduction-default"
                type="number"
                step="0.01"
                value={defaultValue}
                onChange={(event) => setDefaultValue(parseFloat(event.target.value) || 0)}
                className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId == null ? 'Add deduction rule' : 'Save changes'}
            </Button>
            {editingId != null ? (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        eyebrow="Reference Table"
        title="Deduction rule list"
        description="Review or edit the reusable rules used in payroll deductions."
      >
        {rules.length === 0 ? (
          <EmptyState title="No deduction rules" description="Add a deduction rule to reuse it in payroll calculations." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-border)] text-[var(--muted)]">
                  <th className="pb-3 pr-4">Rule</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4 text-right">Default</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.Id} className="border-b border-[var(--surface-border)]/70">
                    <td className="py-4 pr-4 font-medium text-[var(--foreground)]">{rule.Name}</td>
                    <td className="py-4 pr-4 text-[var(--muted)]">
                      {rule.Type === 'percentage' ? 'Percentage-based' : 'Fixed amount'}
                    </td>
                    <td className="py-4 pr-4 text-right text-[var(--foreground)]">
                      {rule.Type === 'percentage' ? `${rule.DefaultValue}%` : formatCurrency(rule.DefaultValue)}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => handleEdit(rule)} className={inlineActionClasses}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(rule.Id)}
                          disabled={deletingId === rule.Id}
                          className="text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === rule.Id ? 'Deleting...' : 'Delete'}
                        </button>
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
