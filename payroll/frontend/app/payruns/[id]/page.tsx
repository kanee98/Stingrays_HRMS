'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_PAYROLL_API_URL || 'http://localhost:4010';

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

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PayRunDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? parseInt(params.id, 10) : NaN;
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Payslip>>({});

  const fetchPayslips = useCallback(async () => {
    if (isNaN(id)) return;
    try {
      setError(null);
      const res = await fetch(`${API_URL}/api/payslips?payRunId=${id}`);
      if (!res.ok) throw new Error('Failed to load payslips');
      const data = await res.json();
      setPayslips(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const openEdit = (p: Payslip) => {
    setEditingId(p.Id);
    setEditForm({
      WorkingDays: p.WorkingDays,
      WorkingHours: p.WorkingHours,
      BasicContractorFee: p.BasicContractorFee,
      Profit121: p.Profit121,
      Allowances: p.Allowances,
      WeekendWeekdaysProfitShare: p.WeekendWeekdaysProfitShare,
      OT: p.OT,
      Commission: p.Commission,
      Admin: p.Admin,
      Outsourced: p.Outsourced,
    });
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (editingId == null) return;
    try {
      const res = await fetch(`${API_URL}/api/payslips/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Update failed');
      closeEdit();
      await fetchPayslips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const name = (p: Payslip) => [p.FirstName, p.LastName].filter(Boolean).join(' ') || '—';

  if (isNaN(id)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">Invalid pay run id.</p>
        <Link href="/payruns" className="text-indigo-600 mt-2 inline-block">Back to pay runs</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : payslips.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payslips. Generate payslips from the pay runs page.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Working Days</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payslips.map((p) => (
                  <tr key={p.Id} className="hover:bg-gray-50">
                    {editingId === p.Id ? (
                      <td colSpan={7} className="px-3 py-4 bg-indigo-50">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                          {(['WorkingDays', 'WorkingHours', 'BasicContractorFee', 'Profit121', 'Allowances', 'WeekendWeekdaysProfitShare', 'OT', 'Commission', 'Admin', 'Outsourced'] as const).map((key) => (
                            <div key={key}>
                              <label className="block text-xs text-gray-500">{key}</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editForm[key] ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                                className="w-full rounded border border-gray-300 px-2 py-1"
                              />
                            </div>
                          ))}
                          <div className="col-span-2 flex gap-2 items-end">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={closeEdit}
                              className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-sm text-gray-900">{name(p)}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{p.Designation ?? '—'}</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-600">{p.WorkingDays}</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">{p.Total?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-600">{p.Deductions?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">{p.NetPay?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
