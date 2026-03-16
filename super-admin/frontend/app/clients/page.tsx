'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '../components/AdminShell';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { cn, formatStatusLabel, getStatusBadgeClasses } from '../lib/adminUi';

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
}

interface ClientFormState {
  clientKey: string;
  name: string;
  description: string;
  contactEmail: string;
  status: string;
  defaultTimezone: string;
  maintenanceMessage: string;
}

const emptyForm: ClientFormState = {
  clientKey: '',
  name: '',
  description: '',
  contactEmail: '',
  status: 'active',
  defaultTimezone: 'Asia/Colombo',
  maintenanceMessage: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
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

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setNotice(null);
    setShowModal(true);
  };

  const openEdit = (client: ClientRecord) => {
    setEditingId(client.Id);
    setForm({
      clientKey: client.ClientKey,
      name: client.Name,
      description: client.Description || '',
      contactEmail: client.ContactEmail || '',
      status: client.Status,
      defaultTimezone: client.DefaultTimezone || 'Asia/Colombo',
      maintenanceMessage: client.MaintenanceMessage || '',
    });
    setNotice(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(editingId ? `/api/admin/clients/${editingId}` : '/api/admin/clients', {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || 'Failed to save tenant');
      }

      closeModal();
      await loadClients();
      setNotice(editingId ? 'Tenant profile updated.' : 'Tenant workspace created.');
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
        [client.Name, client.ClientKey, client.ContactEmail || '', client.Description || '']
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
      maintenance: clients.filter((client) => client.MaintenanceMessage).length,
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
            <SummaryCard label="Maintenance notices" value={summary.maintenance} helper="Operator-facing service messages" />
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
                    <th className="pb-3 pr-4">Owner</th>
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
                          <p className="font-medium text-[var(--muted-strong)]">{client.ContactEmail || 'Unassigned'}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{client.DefaultTimezone}</p>
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
                          <div className="flex flex-col items-start gap-3">
                            <button
                              type="button"
                              onClick={() => openEdit(client)}
                              className="text-sm font-semibold text-[var(--primary)]"
                            >
                              Edit tenant
                            </button>
                            <Link href={`/clients/${client.Id}`} className="text-sm font-medium text-[var(--muted-strong)]">
                              Open access policy
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/40" onClick={closeModal} />
            <div className="relative z-10 w-full max-w-4xl rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-lg)]">
              <div className="rounded-3xl bg-[var(--surface-muted)] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                  {editingId ? 'Edit Tenant' : 'Create Tenant'}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {editingId ? 'Update tenant profile' : 'Create a tenant workspace'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Capture a clear tenant identity, assign the operational status, and define the support owner before
                  opening product access.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 grid gap-6 md:grid-cols-2">
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
                    placeholder="stingrays-emea"
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
                    placeholder="Stingrays EMEA"
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

                <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-2xl border border-[var(--surface-border)] px-5 py-3 text-sm font-medium text-[var(--muted-strong)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create tenant'}
                  </button>
                </div>
              </form>
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
