'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';
import Link from 'next/link';

const API_URL = getEmployeeApiUrl();

const PAGE_SIZES = [10, 25, 50, 100];

const PROSPECT_TYPES = [
  'Swimming Instructor',
  'Customer Service Assistant',
  'Assistant Coordinator',
] as const;

interface Prospect {
  Id: number;
  FirstName: string;
  LastName: string;
  FullName: string | null;
  Email: string | null;
  Source: string;
  CityArea: string | null;
  Phone: string | null;
  Gender: string | null;
  DateOfBirth: string | null;
  InterviewDate: string | null;
  InterviewTime: string | null;
  InterviewStatus: string | null;
  ProspectType: string | null;
  CreatedAt: string;
  ConvertedToEmployeeId: number | null;
}

export default function ProspectsPage() {
  const [data, setData] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [uploadProspectType, setUploadProspectType] = useState<string>(PROSPECT_TYPES[0]);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), sort: 'CreatedAt', order: 'desc' });
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(
        `${API_URL}/api/prospects?${params.toString()}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
        setTotal(json.total ?? 0);
        setTotalPages(json.totalPages ?? 1);
      } else {
        setData([]);
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploadSuccess('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prospectType', uploadProspectType);
      const res = await fetch(`${API_URL}/api/prospects/upload`, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Upload failed');
      setUploadSuccess(result.message || `${result.count} prospect(s) imported.`);
      setSelectedIds(new Set());
      fetchProspects();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload Excel');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((p) => p.Id)));
    }
  };

  const handleDeleteOne = async (id: number) => {
    if (!confirm('Delete this prospect?')) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`${API_URL}/api/prospects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        fetchProspects();
      } else {
        const err = await res.json();
        alert(err.error || 'Delete failed');
      }
    } catch (e) {
      alert('Delete failed');
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      alert('Select at least one prospect.');
      return;
    }
    if (!confirm(`Delete ${ids.length} selected prospect(s)?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/prospects/delete-selected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Delete failed');
      setSelectedIds(new Set());
      fetchProspects();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const displayName = (p: Prospect) =>
    p.FullName?.trim() || [p.FirstName, p.LastName].filter(Boolean).join(' ') || '—';

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Prospects</h2>
          <p className="text-gray-600 mb-6">
            Candidate pipeline. Import from Excel, review in Prospect Checklist, then book interviews and send to onboarding.
          </p>

          {/* Upload */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import from Excel</h3>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div>
                <label htmlFor="uploadType" className="block text-sm font-medium text-gray-700 mb-1">Prospect type</label>
                <select
                  id="uploadType"
                  value={uploadProspectType}
                  onChange={(e) => setUploadProspectType(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {PROSPECT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                >
                  {uploading ? 'Uploading…' : 'Choose Excel file'}
                </button>
              </div>
            </div>
            {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
            {uploadSuccess && <p className="mt-2 text-sm text-green-600">{uploadSuccess}</p>}
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Prospects list</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <label htmlFor="typeFilter" className="text-gray-600">Type</label>
                  <select
                    id="typeFilter"
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value="">All</option>
                    {PROSPECT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                  >
                    Delete selected ({selectedIds.size})
                  </button>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Rows per page</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="border border-gray-300 rounded-md px-2 py-1"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading…</div>
            ) : data.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 font-medium">No prospects yet</p>
                <p className="text-sm text-gray-400 mt-1">Upload an Excel file to import.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={data.length > 0 && selectedIds.size === data.length}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City/Area</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DOB</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interview</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.map((p) => (
                        <tr key={p.Id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(p.Id)}
                              onChange={() => toggleSelect(p.Id)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.ProspectType || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {displayName(p)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.CityArea || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.Phone || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.Gender || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {p.DateOfBirth ? String(p.DateOfBirth).slice(0, 10) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {p.InterviewDate
                              ? `${String(p.InterviewDate).slice(0, 10)}${p.InterviewTime ? ` ${p.InterviewTime}` : ''}`
                              : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {p.ConvertedToEmployeeId ? (
                              <span className="text-green-600">Onboarding</span>
                            ) : p.InterviewStatus ? (
                              <span className="text-amber-600">{p.InterviewStatus}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                            <Link
                              href={`/prospects/checklist/${p.Id}`}
                              className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              Checklist
                            </Link>
                            {p.ConvertedToEmployeeId && (
                              <Link
                                href={`/onboarding?employeeId=${p.ConvertedToEmployeeId}`}
                                className="text-green-600 hover:text-green-800 font-medium"
                              >
                                Onboarding
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteOne(p.Id)}
                              disabled={deletingIds.has(p.Id)}
                              className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                            >
                              {deletingIds.has(p.Id) ? 'Deleting…' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1.5 text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
