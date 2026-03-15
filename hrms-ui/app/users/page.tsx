'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

/** Auth API URL: use auth subdomain when on subdomain, else env or localhost */
function getAuthServiceUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const parts = window.location.hostname.split('.');
    if (parts.length >= 2) return `${window.location.protocol}//auth.${parts.slice(-2).join('.')}`;
  }
  return process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:4001';
}

interface Role {
  Id: number;
  Name: string;
}

interface User {
  Id: number;
  Email: string;
  IsActive: boolean;
  CreatedAt: string;
  roles: string[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ email: '', password: '', roleIds: [] as number[], isActive: true });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${getAuthServiceUrl()}/api/users`);
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch(`${getAuthServiceUrl()}/api/users/roles`);
      if (!res.ok) return;
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ email: '', password: '', roleIds: [], isActive: true });
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    const roleIds = roles.filter((r) => u.roles.includes(r.Name)).map((r) => r.Id);
    setEditingId(u.Id);
    setForm({ email: u.Email, password: '', roleIds, isActive: u.IsActive });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ email: '', password: '', roleIds: [], isActive: true });
  };

  const toggleRole = (roleId: number) => {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(roleId) ? f.roleIds.filter((id) => id !== roleId) : [...f.roleIds, roleId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const body: { email: string; password?: string; roleIds: number[]; isActive: boolean } = {
          email: form.email,
          roleIds: form.roleIds,
          isActive: form.isActive,
        };
        if (form.password) body.password = form.password;
        const res = await fetch(`${getAuthServiceUrl()}/api/users/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Update failed');
      } else {
        if (!form.password) throw new Error('Password is required for new users');
        const res = await fetch(`${getAuthServiceUrl()}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password, roleIds: form.roleIds }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Create failed');
      }
      closeForm();
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: number) => setDeleteId(id);
  const cancelDelete = () => setDeleteId(null);

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    try {
      const res = await fetch(`${getAuthServiceUrl()}/api/users/${deleteId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Delete failed');
      setDeleteId(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Users</h2>
              <p className="text-gray-600 mt-1">Manage login accounts and roles (admin, hr, employee).</p>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add user
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No users yet. Add one to get started.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((u) => (
                      <tr key={u.Id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{u.Email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {u.roles.length ? u.roles.join(', ') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${u.IsActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                            {u.IsActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium mr-4"
                          >
                            Edit
                          </button>
                          {u.IsActive && (
                            <button
                              type="button"
                              onClick={() => confirmDelete(u.Id)}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={closeForm} aria-hidden />
              <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingId ? 'Edit user' : 'Add user'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {editingId && '(leave blank to keep current)'}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder={editingId ? '••••••••' : ''}
                      required={!editingId}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((r) => (
                        <label key={r.Id} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={form.roleIds.includes(r.Id)}
                            onChange={() => toggleRole(r.Id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                          />
                          <span className="text-sm text-gray-700">{r.Name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {editingId && (
                    <div>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={form.isActive}
                          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add user'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {deleteId != null && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={cancelDelete} aria-hidden />
              <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete user?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  The user will be deactivated and will not be able to log in. You can reactivate them by editing and turning Active back on.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelDelete}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Deactivate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
