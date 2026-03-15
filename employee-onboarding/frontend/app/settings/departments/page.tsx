'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { DashboardLayout } from '../../components/DashboardLayout';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_EMPLOYEE_API_URL ||
  "/api-proxy";

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError && (e.message === 'Failed to fetch' || (e as Error).message?.includes('fetch'));
}

interface Department {
  Id: number;
  Name: string;
  SortOrder: number;
  IsActive: boolean;
  CreatedAt?: string;
  UpdatedAt?: string | null;
}

export default function DepartmentsSettingsPage() {
  const [list, setList] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const fetchList = async () => {
    try {
      setError('');
      const res = await fetch(`${API_URL}/api/settings/departments/all`);
      if (!res.ok) throw new Error('Failed to load departments');
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      if (isNetworkError(e)) {
        setError(
          API_URL.startsWith("/")
            ? "Cannot connect to the employee API. Ensure the employee-onboarding API is running (port 4000) and that both the frontend and API are running."
            : `Cannot connect to the API at ${API_URL}. Make sure the employee-onboarding API is running and NEXT_PUBLIC_API_URL is set correctly.`
        );
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load departments.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/settings/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), sortOrder: list.length }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create');
      }
      setNewName('');
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: Department) => {
    setEditingId(row.Id);
    setEditName(row.Name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId == null || !editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/settings/departments/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update');
      }
      cancelEdit();
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Deactivate this department? It will no longer appear in the onboarding dropdown.')) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/settings/departments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to deactivate');
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to deactivate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Departments</h1>
          <p className="text-gray-600 text-sm mb-6">
            Configure departments for employee onboarding. Only active departments appear in the Personal Information step.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="mb-8 p-4 bg-gray-50 rounded-lg flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New department</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Customer Support"
                className="border border-gray-300 rounded-lg px-3 py-2 w-56"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Add
            </button>
          </form>

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : list.length === 0 ? (
            <p className="text-gray-500">No departments yet. Add one above.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.map((row) => (
                    <tr key={row.Id} className={row.IsActive ? '' : 'bg-gray-50 opacity-75'}>
                      <td className="px-4 py-3">
                        {editingId === row.Id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 w-48"
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{row.Name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.SortOrder}</td>
                      <td className="px-4 py-3">
                        <span className={row.IsActive ? 'text-green-600' : 'text-gray-400'}>
                          {row.IsActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingId === row.Id ? (
                          <>
                            <button
                              type="button"
                              onClick={handleUpdate}
                              disabled={saving || !editName.trim()}
                              className="text-indigo-600 hover:underline mr-3 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button type="button" onClick={cancelEdit} className="text-gray-600 hover:underline">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {row.IsActive && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(row)}
                                  className="text-indigo-600 hover:underline mr-3"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeactivate(row.Id)}
                                  disabled={saving}
                                  className="text-red-600 hover:underline disabled:opacity-50"
                                >
                                  Deactivate
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
