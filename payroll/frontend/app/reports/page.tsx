'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_PAYROLL_API_URL || 'http://localhost:4010';

interface SummaryRow {
  Month: number;
  Year: number;
  Status: string;
  PayslipCount: number;
  TotalGross: number;
  TotalDeductions: number;
  TotalNetPay: number;
}

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ReportsPage() {
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [detail, setDetail] = useState<Record<string, unknown>[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/api/reports/payroll-summary`);
      if (!res.ok) throw new Error('Failed to load summary');
      const data = await res.json();
      setSummary(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setSummary([]);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const fetchMonthlyDetail = useCallback(async () => {
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/reports/monthly-detail?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Failed to load detail');
      const data = await res.json();
      setDetail(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setDetail([]);
    } finally {
      setLoadingDetail(false);
    }
  }, [month, year]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payroll summary</h2>
          {loadingSummary ? (
            <div className="p-6 text-center text-gray-500">Loading…</div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month / Year</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Payslips</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total gross</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total deductions</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total net pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {summary.map((s, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-sm text-gray-900">{monthNames[(s.Month as number) - 1]} {s.Year}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{s.Status}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-600">{s.PayslipCount}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-900">{(s.TotalGross as number)?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-600">{(s.TotalDeductions as number)?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">{(s.TotalNetPay as number)?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {summary.length === 0 && (
                <div className="p-6 text-center text-gray-500 text-sm">No pay runs yet.</div>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly detail</h2>
          <div className="flex gap-4 items-end mb-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Month</label>
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
              <label className="block text-sm text-gray-700 mb-1">Year</label>
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
              type="button"
              onClick={fetchMonthlyDetail}
              disabled={loadingDetail}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loadingDetail ? 'Loading…' : 'Load'}
            </button>
          </div>
          {detail.length > 0 && (
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {detail.map((d, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {[d.FirstName, d.LastName].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">{String(d.Designation ?? '—')}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900">{(d.Total as number)?.toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-600">{(d.Deductions as number)?.toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">{(d.NetPay as number)?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
    </div>
  );
}
