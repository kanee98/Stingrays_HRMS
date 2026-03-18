'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@shared/components/Button';
import { EmptyState } from '@shared/components/EmptyState';
import { Field } from '@shared/components/Field';
import { ModalShell } from '@shared/components/ModalShell';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { StatusBadge } from '@shared/components/StatusBadge';
import { checkboxClasses, inputClasses, inlineActionClasses, tableBodyRowClasses, tableHeaderRowClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

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

const USERS_API_BASE_PATH = '/api/users';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ email: '', password: '', roleIds: [] as number[], isActive: true });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(USERS_API_BASE_PATH, { credentials: 'include' });
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
      const res = await fetch(`${USERS_API_BASE_PATH}/roles`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
    void fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ email: '', password: '', roleIds: [], isActive: true });
    setError(null);
    setNotice(null);
    setShowForm(true);
  };

  const openEdit = (user: User) => {
    const roleIds = roles.filter((role) => user.roles.includes(role.Name)).map((role) => role.Id);
    setEditingId(user.Id);
    setForm({ email: user.Email, password: '', roleIds, isActive: user.IsActive });
    setError(null);
    setNotice(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ email: '', password: '', roleIds: [], isActive: true });
  };

  const toggleRole = (roleId: number) => {
    setForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (editingId) {
        const body: { email: string; password?: string; roleIds: number[]; isActive: boolean } = {
          email: form.email,
          roleIds: form.roleIds,
          isActive: form.isActive,
        };
        if (form.password) body.password = form.password;
        const res = await fetch(`${USERS_API_BASE_PATH}/${editingId}`, {
          credentials: 'include',
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Update failed');
        setNotice('User updated.');
      } else {
        if (!form.password) throw new Error('Password is required for new users');
        const res = await fetch(USERS_API_BASE_PATH, {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password, roleIds: form.roleIds }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Create failed');
        setNotice('User created.');
      }
      closeForm();
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${USERS_API_BASE_PATH}/${deleteId}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Delete failed');
      setDeleteId(null);
      setNotice('User deactivated.');
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const activeUsers = users.filter((user) => user.IsActive).length;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            eyebrow="Access Management"
            title="Users"
            description="Manage login accounts and role assignments using the same shared page, table, and modal patterns as the rest of the platform."
            actions={<Button type="button" onClick={openAdd}>Add user</Button>}
          />

          {error ? <NoticeBanner tone="error" message={error} /> : null}
          {notice ? <NoticeBanner tone="success" message={notice} /> : null}

          <div className="grid gap-4 md:grid-cols-3">
            <SectionCard>
              <p className="text-sm font-medium text-[var(--muted)]">Total users</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{users.length}</p>
            </SectionCard>
            <SectionCard>
              <p className="text-sm font-medium text-[var(--muted)]">Active users</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{activeUsers}</p>
            </SectionCard>
            <SectionCard>
              <p className="text-sm font-medium text-[var(--muted)]">Role catalog</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{roles.length}</p>
            </SectionCard>
          </div>

          <SectionCard eyebrow="Directory" title="User accounts" description="Create accounts, assign roles, and deactivate access without leaving the shared management workspace.">
            {loading ? (
              <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">Loading users...</div>
            ) : users.length === 0 ? (
              <EmptyState title="No users created" description="Add the first user account to start assigning platform access." action={<Button type="button" onClick={openAdd}>Add user</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className={tableHeaderRowClasses}>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Roles</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.Id} className={tableBodyRowClasses}>
                        <td className="py-4 pr-4 font-medium text-[var(--foreground)]">{user.Email}</td>
                        <td className="py-4 pr-4 text-[var(--muted)]">{user.roles.length ? user.roles.join(', ') : 'No roles assigned'}</td>
                        <td className="py-4 pr-4">
                          <StatusBadge label={user.IsActive ? 'Active' : 'Inactive'} tone={user.IsActive ? 'success' : 'neutral'} />
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-4">
                            <button type="button" onClick={() => openEdit(user)} className={inlineActionClasses}>
                              Edit
                            </button>
                            {user.IsActive ? (
                              <button
                                type="button"
                                onClick={() => setDeleteId(user.Id)}
                                className="text-sm font-semibold text-red-600 transition hover:text-red-700"
                              >
                                Deactivate
                              </button>
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

          {showForm ? (
            <ModalShell
              title={editingId ? 'Edit user' : 'Add user'}
              description="Assign login access and roles using the shared admin modal pattern."
              onClose={closeForm}
              footer={
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button>
                  <Button type="submit" form="user-form" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add user'}</Button>
                </div>
              }
            >
              <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
                <Field label="Email" htmlFor="user-email" required>
                  <input
                    id="user-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                    className={inputClasses}
                  />
                </Field>
                <Field label={editingId ? 'Password (leave blank to keep current)' : 'Password'} htmlFor="user-password" required={!editingId}>
                  <input
                    id="user-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                    required={!editingId}
                    className={inputClasses}
                  />
                </Field>
                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--muted-strong)]">Roles</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roles.map((role) => (
                      <label key={role.Id} className="flex items-start gap-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted-strong)]">
                        <input
                          type="checkbox"
                          checked={form.roleIds.includes(role.Id)}
                          onChange={() => toggleRole(role.Id)}
                          className={checkboxClasses}
                        />
                        <span>{role.Name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {editingId ? (
                  <label className="flex items-start gap-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted-strong)]">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.checked }))}
                      className={checkboxClasses}
                    />
                    <span>Account active</span>
                  </label>
                ) : null}
              </form>
            </ModalShell>
          ) : null}

          {deleteId != null ? (
            <ModalShell
              title="Deactivate user"
              description="This will disable sign-in for the selected user until the account is reactivated."
              onClose={() => setDeleteId(null)}
              maxWidthClassName="max-w-lg"
              footer={
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
                  <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
                    {deleting ? 'Deactivating...' : 'Deactivate user'}
                  </Button>
                </div>
              }
            >
              <p className="text-sm leading-6 text-[var(--muted)]">The user will lose access to the workspace until the account is reactivated from the edit dialog.</p>
            </ModalShell>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
