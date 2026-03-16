'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '../components/AdminShell';
import { ProtectedRoute } from '../components/ProtectedRoute';

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
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadClients = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/clients', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to load clients');
      }
      const payload = (await response.json()) as ClientRecord[];
      setClients(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
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

    try {
      const response = await fetch(
        editingId ? `/api/admin/clients/${editingId}` : '/api/admin/clients',
        {
          method: editingId ? 'PUT' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || 'Failed to save client');
      }

      closeModal();
      await loadClients();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminShell>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Clients</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">Manage client tenancy</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                Create client workspaces, control operational status, and configure service rollout before enabling modules.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              Add client
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--surface-border)] text-[var(--muted)]">
                    <th className="pb-3 pr-4">Client</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Enabled services</th>
                    <th className="pb-3 pr-4">Enabled sections</th>
                    <th className="pb-3 pr-4">Timezone</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.Id} className="border-b border-[var(--surface-border)]/70">
                      <td className="py-4 pr-4">
                        <p className="font-medium text-[var(--foreground)]">{client.Name}</p>
                        <p className="text-xs text-[var(--muted)]">{client.ClientKey}</p>
                      </td>
                      <td className="py-4 pr-4 text-[var(--muted-strong)] capitalize">{client.Status}</td>
                      <td className="py-4 pr-4 text-[var(--muted)]">{client.EnabledServices}</td>
                      <td className="py-4 pr-4 text-[var(--muted)]">{client.EnabledSections}</td>
                      <td className="py-4 pr-4 text-[var(--muted)]">{client.DefaultTimezone}</td>
                      <td className="py-4">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => openEdit(client)}
                            className="text-sm font-medium text-[var(--primary)]"
                          >
                            Edit
                          </button>
                          <Link href={`/clients/${client.Id}`} className="text-sm font-medium text-[var(--muted-strong)]">
                            Manage access
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/40" onClick={closeModal} />
            <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-lg)]">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">
                {editingId ? 'Edit client' : 'Create client'}
              </h3>
              <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Client key</label>
                  <input
                    value={form.clientKey}
                    onChange={(event) => setForm((current) => ({ ...current, clientKey: event.target.value }))}
                    disabled={editingId != null}
                    required
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3 disabled:bg-[var(--surface-muted)]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Name</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    required
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Status</label>
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
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Contact email</label>
                  <input
                    value={form.contactEmail}
                    onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    rows={3}
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Default timezone</label>
                  <input
                    value={form.defaultTimezone}
                    onChange={(event) => setForm((current) => ({ ...current, defaultTimezone: event.target.value }))}
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">Maintenance message</label>
                  <input
                    value={form.maintenanceMessage}
                    onChange={(event) => setForm((current) => ({ ...current, maintenanceMessage: event.target.value }))}
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
                    {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create client'}
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
