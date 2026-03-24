'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '../components/AdminShell';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { cn, formatDateTime, formatStatusLabel, getStatusBadgeClasses } from '../lib/adminUi';
import { adminPath } from '../lib/routes';

interface ClientRecord {
  Id: number;
  ClientKey: string;
  Name: string;
  Description: string | null;
  ContactEmail: string | null;
  Status: string;
  DefaultTimezone: string;
  MaintenanceMessage: string | null;
  EnabledServices: number;
  EnabledSections: number;
  AdminUserId: number | null;
  AdminFullName: string | null;
  AdminEmail: string | null;
  AdminIsActive: boolean | null;
  AdminMustChangePassword: boolean | null;
  AdminLastPasswordResetAt: string | null;
  AdminPasswordChangedAt: string | null;
}

interface TenantAdminFormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  isActive: boolean;
  requirePasswordChange: boolean;
}

interface ClientFormState {
  clientKey: string;
  name: string;
  description: string;
  contactEmail: string;
  status: string;
  defaultTimezone: string;
  maintenanceMessage: string;
  adminAccount: TenantAdminFormState;
}

const emptyAdminForm: TenantAdminFormState = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  isActive: true,
  requirePasswordChange: true,
};

const emptyForm: ClientFormState = {
  clientKey: '',
  name: '',
  description: '',
  contactEmail: '',
  status: 'active',
  defaultTimezone: 'Asia/Colombo',
  maintenanceMessage: '',
  adminAccount: emptyAdminForm,
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/clients', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to load tenant directory');
      }
      const payload = (await response.json()) as ClientRecord[];
      setClients(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  useEffect(() => {
    if (!showModal) {
      return undefined;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const previousHtmlOverflow = documentElement.style.overflow;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    documentElement.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, [showModal]);

  const openCreate = () => {
    setEditingId(null);
    setSelectedClient(null);
    setForm(emptyForm);
    setNotice(null);
    setShowModal(true);
  };

  const openEdit = (client: ClientRecord) => {
    setEditingId(client.Id);
    setSelectedClient(client);
    setForm({
      clientKey: client.ClientKey,
      name: client.Name,
      description: client.Description || '',
      contactEmail: client.ContactEmail || '',
      status: client.Status,
      defaultTimezone: client.DefaultTimezone || 'Asia/Colombo',
      maintenanceMessage: client.MaintenanceMessage || '',
      adminAccount: {
        fullName: client.AdminFullName || '',
        email: client.AdminEmail || '',
        password: '',
        confirmPassword: '',
        isActive: client.AdminIsActive ?? true,
        requirePasswordChange: client.AdminMustChangePassword ?? true,
      },
    });
    setNotice(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setSelectedClient(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const adminFullName = form.adminAccount.fullName.trim();
      const adminEmail = form.adminAccount.email.trim().toLowerCase();
      const adminPassword = form.adminAccount.password;
      const adminPasswordConfirmation = form.adminAccount.confirmPassword;
      const hasExistingAdminAccount = Boolean(selectedClient?.AdminUserId);
      const passwordProvided = adminPassword.length > 0 || adminPasswordConfirmation.length > 0;
      const shouldProvisionAdminAccount = !editingId || hasExistingAdminAccount || Boolean(adminFullName || adminEmail || passwordProvided);

      if (!editingId && (!adminFullName || !adminEmail || !adminPassword)) {
        throw new Error('Tenant admin full name, email, and password are required');
      }

      if (!hasExistingAdminAccount && editingId && shouldProvisionAdminAccount && (!adminFullName || !adminEmail || !adminPassword)) {
        throw new Error('Provide the tenant admin full name, email, and password to provision the account');
      }

      if (passwordProvided) {
        if (!adminPassword) {
          throw new Error('Password is required when confirming a reset');
        }

        if (adminPassword !== adminPasswordConfirmation) {
          throw new Error('Password and confirmation must match');
        }

        const passwordError = validatePasswordStrength(adminPassword);
        if (passwordError) {
          throw new Error(passwordError);
        }
      }

      const payload: Record<string, unknown> = {
        clientKey: form.clientKey.trim().toLowerCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        contactEmail: form.contactEmail.trim(),
        status: form.status,
        defaultTimezone: form.defaultTimezone.trim(),
        maintenanceMessage: form.maintenanceMessage.trim(),
      };

      if (shouldProvisionAdminAccount) {
        payload.adminAccount = {
          fullName: adminFullName,
          email: adminEmail,
          ...(adminPassword ? { password: adminPassword } : {}),
          isActive: form.adminAccount.isActive,
          mustChangePassword: form.adminAccount.requirePasswordChange,
        };
      }

      const response = await fetch(editingId ? `/api/admin/clients/${editingId}` : '/api/admin/clients', {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || 'Failed to save tenant');
      }

      const noticeMessage = !editingId
        ? 'Tenant workspace and admin account created.'
        : passwordProvided
          ? 'Tenant profile updated and admin password reset.'
          : !hasExistingAdminAccount && shouldProvisionAdminAccount
            ? 'Tenant profile updated and admin account provisioned.'
            : 'Tenant profile updated.';

      closeModal();
      await loadClients();
      setNotice(noticeMessage);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesStatus = statusFilter === 'all' || client.Status.toLowerCase() === statusFilter;
      const matchesQuery =
        query.length === 0 ||
        [client.Name, client.ClientKey, client.ContactEmail || '', client.Description || '', client.AdminFullName || '', client.AdminEmail || '']
          .join(' ')
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [clients, searchQuery, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: clients.length,
      active: clients.filter((client) => client.Status === 'active').length,
      review: clients.filter((client) => client.Status === 'pilot' || client.Status === 'suspended').length,
      passwordRotations: clients.filter((client) => client.AdminMustChangePassword).length,
    };
  }, [clients]);

  return (
    <ProtectedRoute>
      <AdminShell>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Tenant Directory</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">Provision and operate tenant workspaces</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                Create tenant records, assign operational ownership, and move each workspace through active, pilot,
                inactive, or suspended lifecycle states.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              Create tenant
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {notice && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total tenants" value={summary.total} helper="Provisioned workspaces" />
            <SummaryCard label="Live tenants" value={summary.active} helper="Active operating state" />
            <SummaryCard label="Needs review" value={summary.review} helper="Pilot or suspended workspaces" />
            <SummaryCard label="Password rotations" value={summary.passwordRotations} helper="Tenant admins pending password change" />
          </div>

          <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_160px]">
              <div>
                <label htmlFor="tenant-search" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                  Search tenants
                </label>
                <input
                  id="tenant-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by tenant name, key, contact, or description"
                  className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                />
              </div>
              <div>
                <label htmlFor="status-filter" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                  Lifecycle state
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                >
                  <option value="all">All states</option>
                  <option value="active">Active</option>
                  <option value="pilot">Pilot</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Visible Results</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{filteredClients.length}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Filtered tenant records</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--surface-border)] text-[var(--muted)]">
                    <th className="pb-3 pr-4">Tenant</th>
                    <th className="pb-3 pr-4">Tenant admin</th>
                    <th className="pb-3 pr-4">Lifecycle</th>
                    <th className="pb-3 pr-4">Product coverage</th>
                    <th className="pb-3 pr-4">Operations note</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading &&
                    filteredClients.map((client) => (
                      <tr key={client.Id} className="border-b border-[var(--surface-border)]/70 align-top">
                        <td className="py-4 pr-4">
                          <p className="font-semibold text-[var(--foreground)]">{client.Name}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{client.ClientKey}</p>
                          {client.Description && (
                            <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">{client.Description}</p>
                          )}
                        </td>
                        <td className="py-4 pr-4">
                          <p className="font-medium text-[var(--muted-strong)]">{client.AdminFullName || 'No tenant admin provisioned'}</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">{client.AdminEmail || client.ContactEmail || 'No login email assigned'}</p>
                          <p className="mt-2 text-xs text-[var(--muted)]">{client.DefaultTimezone}</p>
                          {client.AdminUserId ? (
                            <div className="mt-3 space-y-1">
                              <p className="text-xs font-medium text-[var(--muted-strong)]">
                                {client.AdminIsActive ? 'Account active' : 'Account disabled'}
                              </p>
                              {client.AdminMustChangePassword && (
                                <p className="text-xs text-amber-700">Password rotation pending on next sign-in.</p>
                              )}
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-amber-700">Provision a tenant admin to enable managed sign-in.</p>
                          )}
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                              getStatusBadgeClasses(client.Status),
                            )}
                          >
                            {formatStatusLabel(client.Status)}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <p className="font-medium text-[var(--foreground)]">{client.EnabledServices} products enabled</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">{client.EnabledSections} modules enabled</p>
                        </td>
                        <td className="py-4 pr-4">
                          <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
                            {client.MaintenanceMessage || 'No current maintenance or customer-facing notice.'}
                          </p>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col items-stretch gap-2 sm:min-w-[180px]">
                            <button
                              type="button"
                              onClick={() => openEdit(client)}
                              className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_-20px_rgba(21,94,239,0.8)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                            >
                              Manage Tenant
                            </button>
                            <Link
                              href={adminPath(`/clients/${client.Id}`)}
                              className="inline-flex items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-2.5 text-sm font-semibold text-[var(--muted-strong)] hover:border-[var(--primary)] hover:bg-white hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                            >
                              Open Policy Access
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {loading && (
                <div className="px-2 py-8 text-sm text-[var(--muted)]">Loading tenant directory...</div>
              )}

              {!loading && filteredClients.length === 0 && (
                <div className="px-2 py-8 text-sm text-[var(--muted)]">
                  No tenants match the current search or lifecycle filter.
                </div>
              )}
            </div>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 overflow-hidden p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-950/40" onClick={closeModal} />
            <div className="relative z-10 flex h-full items-start justify-center py-2 sm:items-center sm:py-6">
              <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] sm:max-h-[calc(100dvh-3rem)]">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--surface-border)] bg-[var(--surface)] px-5 py-5 sm:px-8">
                  <div className="rounded-3xl bg-[var(--surface-muted)] px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                      {editingId ? 'Edit Tenant' : 'Create Tenant'}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                      {editingId ? 'Update tenant profile' : 'Create a tenant workspace'}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      Capture the tenant identity, define the workspace lifecycle, and provision the primary admin account
                      before opening product access.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--muted-strong)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  >
                    Close
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
                    <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Identity</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Use a stable tenant key for routing and policy records, then give the workspace a clear display name.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Tenant key</label>
                  <input
                    value={form.clientKey}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, clientKey: event.target.value.toLowerCase() }))
                    }
                    disabled={editingId != null}
                    required
                    placeholder="acme-emea"
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3 disabled:bg-[var(--surface-muted)]"
                  />
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    Lowercase unique identifier used for tenant routing, policy mapping, and service lookups.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Display name</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    required
                    placeholder="Acme EMEA"
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Internal description</label>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    rows={3}
                    placeholder="Optional internal note describing this tenant workspace."
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>

                <div className="md:col-span-2 mt-2">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Operations</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Define the tenant owner, lifecycle state, and any customer-facing maintenance notice.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Lifecycle state</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  >
                    <option value="active">Active</option>
                    <option value="pilot">Pilot</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    Use pilot for controlled rollout and suspended when the tenant should not operate normally.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Primary contact email</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
                    placeholder="ops@tenant.com"
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Default timezone</label>
                  <input
                    value={form.defaultTimezone}
                    onChange={(event) => setForm((current) => ({ ...current, defaultTimezone: event.target.value }))}
                    placeholder="Asia/Colombo"
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Maintenance or service banner</label>
                  <textarea
                    value={form.maintenanceMessage}
                    onChange={(event) => setForm((current) => ({ ...current, maintenanceMessage: event.target.value }))}
                    rows={3}
                    placeholder="Optional customer-facing message for temporary maintenance or service disruption."
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>

                <div className="md:col-span-2 mt-2">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Tenant administrator</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Provision one primary tenant admin account, enforce password rotation by default, and use this same
                    section to rotate or disable the account later.
                  </p>
                </div>

                {selectedClient?.AdminUserId && (
                  <div className="md:col-span-2 rounded-3xl bg-[var(--surface-muted)] px-5 py-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                          Existing account
                        </p>
                        <p className="mt-2 text-sm text-[var(--muted-strong)]">
                          {selectedClient.AdminFullName || 'Tenant admin'} - {selectedClient.AdminEmail}
                        </p>
                      </div>
                      <div className="text-sm text-[var(--muted)]">
                        <p>{selectedClient.AdminIsActive ? 'Active account' : 'Account currently disabled'}</p>
                        <p>
                          {selectedClient.AdminLastPasswordResetAt
                            ? `Last reset ${formatDateTime(selectedClient.AdminLastPasswordResetAt)}`
                            : 'No password reset recorded yet'}
                        </p>
                      </div>
                    </div>
                    {selectedClient.AdminMustChangePassword && (
                      <p className="mt-3 text-sm text-amber-700">
                        This admin must rotate the current password before entering the workspace.
                      </p>
                    )}
                  </div>
                )}

                {!selectedClient?.AdminUserId && editingId != null && (
                  <div className="md:col-span-2 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                    This tenant does not yet have a managed admin account. Provide the details below and include a
                    password to provision one.
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Admin full name</label>
                  <input
                    value={form.adminAccount.fullName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        adminAccount: { ...current.adminAccount, fullName: event.target.value },
                      }))
                    }
                    placeholder="Alex Johnson"
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Admin login email</label>
                  <input
                    type="email"
                    value={form.adminAccount.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        adminAccount: { ...current.adminAccount, email: event.target.value.toLowerCase() },
                      }))
                    }
                    placeholder="admin@tenant.com"
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                    {selectedClient?.AdminUserId ? 'New password' : 'Initial password'}
                  </label>
                  <input
                    type="password"
                    value={form.adminAccount.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        adminAccount: { ...current.adminAccount, password: event.target.value },
                      }))
                    }
                    placeholder={selectedClient?.AdminUserId ? 'Leave blank to keep the current password' : 'Create a strong password'}
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    Minimum 12 characters with uppercase, lowercase, number, and symbol characters.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Confirm password</label>
                  <input
                    type="password"
                    value={form.adminAccount.confirmPassword}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        adminAccount: { ...current.adminAccount, confirmPassword: event.target.value },
                      }))
                    }
                    placeholder={selectedClient?.AdminUserId ? 'Repeat the new password when rotating it' : 'Repeat the initial password'}
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>

                <div className="md:col-span-2 grid gap-4 rounded-3xl bg-[var(--surface-muted)] px-5 py-4 md:grid-cols-2">
                  <label className="flex items-start gap-3 text-sm text-[var(--muted-strong)]">
                    <input
                      type="checkbox"
                      checked={form.adminAccount.isActive}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          adminAccount: { ...current.adminAccount, isActive: event.target.checked },
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-[var(--surface-border)]"
                    />
                    <span>
                      <span className="block font-medium text-[var(--foreground)]">Account active</span>
                      Allow this tenant admin to authenticate into the shared portal and tenant-enabled services.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-[var(--muted-strong)]">
                    <input
                      type="checkbox"
                      checked={form.adminAccount.requirePasswordChange}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          adminAccount: { ...current.adminAccount, requirePasswordChange: event.target.checked },
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-[var(--surface-border)]"
                    />
                    <span>
                      <span className="block font-medium text-[var(--foreground)]">Force password rotation</span>
                      Keep this enabled for new accounts and resets so the assigned password is changed on next sign-in.
                    </span>
                  </label>
                </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-[var(--surface-border)] bg-[var(--surface)] px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex items-center justify-center rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--muted-strong)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_-22px_rgba(21,94,239,0.85)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Tenant'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </AdminShell>
    </ProtectedRoute>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-[var(--foreground)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{helper}</p>
    </div>
  );
}

function validatePasswordStrength(password: string) {
  if (/\s/.test(password)) {
    return 'Password must not contain spaces';
  }

  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Password must be at least 12 characters and include uppercase, lowercase, number, and symbol characters';
  }

  return null;
}
