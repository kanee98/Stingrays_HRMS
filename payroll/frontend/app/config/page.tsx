'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_PAYROLL_API_URL || 'http://localhost:4010';

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
  Type: string;
  DefaultValue: number;
}

export default function ConfigPage() {
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [deductionRules, setDeductionRules] = useState<DeductionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'tax' | 'deductions'>('tax');

  const fetchTax = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/taxbrackets`);
    if (res.ok) {
      const data = await res.json();
      setTaxBrackets(Array.isArray(data) ? data : []);
    }
  }, []);

  const fetchDeductions = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/deductionrules`);
    if (res.ok) {
      const data = await res.json();
      setDeductionRules(Array.isArray(data) ? data : []);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTax(), fetchDeductions()]).finally(() => setLoading(false));
  }, [fetchTax, fetchDeductions]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setTab('tax')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'tax' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Tax brackets
          </button>
          <button
            type="button"
            onClick={() => setTab('deductions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'deductions' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Deduction rules
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : tab === 'tax' ? (
          <TaxBracketsSection brackets={taxBrackets} onRefresh={fetchTax} setError={setError} />
        ) : (
          <DeductionRulesSection rules={deductionRules} onRefresh={fetchDeductions} setError={setError} />
        )}
    </div>
  );
}

function TaxBracketsSection({
  brackets,
  onRefresh,
  setError,
}: {
  brackets: TaxBracket[];
  onRefresh: () => void;
  setError: (s: string | null) => void;
}) {
  const [name, setName] = useState('');
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(100000);
  const [ratePercent, setRatePercent] = useState(0);
  const [saving, setSaving] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_PAYROLL_API_URL || 'http://localhost:4010';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/taxbrackets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, minAmount, maxAmount, ratePercent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Create failed');
      setName('');
      setMinAmount(0);
      setMaxAmount(100000);
      setRatePercent(0);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/taxbrackets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Add tax bracket</h3>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm w-40"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Min amount</label>
            <input
              type="number"
              step="0.01"
              value={minAmount}
              onChange={(e) => setMinAmount(parseFloat(e.target.value) || 0)}
              className="rounded border border-gray-300 px-3 py-2 text-sm w-28"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Max amount</label>
            <input
              type="number"
              step="0.01"
              value={maxAmount}
              onChange={(e) => setMaxAmount(parseFloat(e.target.value) || 0)}
              className="rounded border border-gray-300 px-3 py-2 text-sm w-28"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Rate %</label>
            <input
              type="number"
              step="0.01"
              value={ratePercent}
              onChange={(e) => setRatePercent(parseFloat(e.target.value) || 0)}
              className="rounded border border-gray-300 px-3 py-2 text-sm w-20"
            />
          </div>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Min</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Max</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate %</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {brackets.map((b) => (
              <tr key={b.Id}>
                <td className="px-4 py-2 text-sm text-gray-900">{b.Name}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-600">{b.MinAmount}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-600">{b.MaxAmount}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-600">{b.RatePercent}%</td>
                <td className="px-4 py-2 text-right">
                  <button type="button" onClick={() => handleDelete(b.Id)} className="text-red-600 hover:text-red-900 text-sm">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {brackets.length === 0 && (
          <div className="p-6 text-center text-gray-500 text-sm">No tax brackets. Add one above.</div>
        )}
      </div>
    </div>
  );
}

function DeductionRulesSection({
  rules,
  onRefresh,
  setError,
}: {
  rules: DeductionRule[];
  onRefresh: () => void;
  setError: (s: string | null) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('fixed');
  const [defaultValue, setDefaultValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_PAYROLL_API_URL || 'http://localhost:4010';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/deductionrules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, defaultValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Create failed');
      setName('');
      setDefaultValue(0);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/deductionrules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Add deduction rule</h3>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm w-48"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'percentage' | 'fixed')}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="fixed">Fixed</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Default value</label>
            <input
              type="number"
              step="0.01"
              value={defaultValue}
              onChange={(e) => setDefaultValue(parseFloat(e.target.value) || 0)}
              className="rounded border border-gray-300 px-3 py-2 text-sm w-28"
            />
          </div>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Default</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rules.map((r) => (
              <tr key={r.Id}>
                <td className="px-4 py-2 text-sm text-gray-900">{r.Name}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{r.Type}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-600">{r.DefaultValue}{r.Type === 'percentage' ? '%' : ''}</td>
                <td className="px-4 py-2 text-right">
                  <button type="button" onClick={() => handleDelete(r.Id)} className="text-red-600 hover:text-red-900 text-sm">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.length === 0 && (
          <div className="p-6 text-center text-gray-500 text-sm">No deduction rules. Add one above.</div>
        )}
      </div>
    </div>
  );
}
