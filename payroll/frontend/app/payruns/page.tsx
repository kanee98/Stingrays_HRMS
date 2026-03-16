'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getPayrollApiUrl } from '@shared/lib/appUrls';

const API_URL = getPayrollApiUrl();

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
  const [showCreate, setShowCreate] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [finalizingId, setFinalizingId] = useState<number | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/api/payruns`);
      if (!res.ok) throw new Error('Failed to load pay runs');
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/payruns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Create failed');
      setShowCreate(false);
      await fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePayslips = async (id: number) => {
    setGeneratingId(id);
    try {
      const res = await fetch(`${API_URL}/api/payruns/${id}/generate-payslips`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Generate failed');
      await fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generate failed');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleFinalize = async (id: number) => {
    setFinalizingId(id);
    try {
      const res = await fetch(`${API_URL}/api/payruns/${id}/finalize`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Finalize failed');
      await fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Finalize failed');
    } finally {
      setFinalizingId(null);
    }
  };

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">Create a pay run for a month/year, then generate payslips by the 2nd.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            New pay run
          </button>
        </div>

        {showCreate && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Create pay run</h3>
            <form onSubmit={handleCreate} className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  {monthNames.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
                  min={2020}
                  max={2030}
                  className="rounded border border-gray-300 px-3 py-2 text-sm w-24"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading…</div>
          ) : runs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pay runs yet. Create one above.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month / Year</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {runs.map((r) => (
                  <tr key={r.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {monthNames[r.Month - 1]} {r.Year}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        r.Status === 'finalized' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.Status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm space-x-2">
                      <Link
                        href={`/payruns/${r.Id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        View payslips
                      </Link>
                      {r.Status === 'draft' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleGeneratePayslips(r.Id)}
                            disabled={generatingId === r.Id}
                            className="text-indigo-600 hover:text-indigo-900 font-medium disabled:opacity-50"
                          >
                            {generatingId === r.Id ? 'Generating…' : 'Generate payslips'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFinalize(r.Id)}
                            disabled={finalizingId === r.Id}
                            className="text-green-600 hover:text-green-900 font-medium disabled:opacity-50"
                          >
                            {finalizingId === r.Id ? 'Finalizing…' : 'Finalize'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
    </div>
  );
}
