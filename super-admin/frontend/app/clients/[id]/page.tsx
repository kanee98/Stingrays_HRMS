'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminShell } from '../../components/AdminShell';
import { ProtectedRoute } from '../../components/ProtectedRoute';

interface AccessSection {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  configJson: string | null;
}

interface AccessService {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  configJson: string | null;
  sections: AccessSection[];
}

interface AccessSnapshot {
  client: {
    id: number;
    key: string;
    name: string;
    status: string;
  };
  services: AccessService[];
}

function isValidJson(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export default function ClientAccessPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const [snapshot, setSnapshot] = useState<AccessSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch(`/api/admin/clients/${clientId}/access`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load client access');
        }
        return response.json();
      })
      .then((payload) => setSnapshot(payload as AccessSnapshot))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load client access'));
  }, [clientId]);

  const updateService = (serviceId: number, changes: Partial<AccessService>) => {
    setSnapshot((current) => {
      if (!current) return current;
      return {
        ...current,
        services: current.services.map((service) =>
          service.id === serviceId ? { ...service, ...changes } : service
        ),
      };
    });
  };

  const updateSection = (serviceId: number, sectionId: number, changes: Partial<AccessSection>) => {
    setSnapshot((current) => {
      if (!current) return current;
      return {
        ...current,
        services: current.services.map((service) =>
          service.id === serviceId
            ? {
                ...service,
                sections: service.sections.map((section) =>
                  section.id === sectionId ? { ...section, ...changes } : section
                ),
              }
            : service
        ),
      };
    });
  };

  const handleSave = async () => {
    if (!snapshot) {
      return;
    }

    const invalidService = snapshot.services.find((service) => !isValidJson(service.configJson || ''));
    const invalidSection = snapshot.services
      .flatMap((service) => service.sections)
      .find((section) => !isValidJson(section.configJson || ''));

    if (invalidService || invalidSection) {
      setError('Config JSON must be valid JSON or blank.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/clients/${clientId}/access`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services: snapshot.services.map((service) => ({
            serviceId: service.id,
            isEnabled: service.isEnabled,
            configJson: service.configJson || null,
          })),
          sections: snapshot.services.flatMap((service) =>
            service.sections.map((section) => ({
              sectionId: section.id,
              isEnabled: section.isEnabled,
              configJson: section.configJson || null,
            })),
          ),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || 'Failed to save access policy');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save access policy');
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
              <Link href="/clients" className="text-sm font-medium text-[var(--primary)]">
                Back to clients
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Client access</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
                {snapshot?.client.name || 'Loading client...'}
              </h2>
              {snapshot && (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {snapshot.client.key} · {snapshot.client.status}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !snapshot}
              className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save policy'}
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-5">
            {snapshot?.services.map((service) => (
              <section key={service.id} className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">{service.name}</h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">{service.description}</p>
                  </div>
                  <label className="inline-flex items-center gap-3 rounded-2xl border border-[var(--surface-border)] px-4 py-3">
                    <input
                      type="checkbox"
                      checked={service.isEnabled}
                      onChange={(event) => updateService(service.id, { isEnabled: event.target.checked })}
                    />
                    <span className="text-sm font-medium text-[var(--muted-strong)]">Service enabled</span>
                  </label>
                </div>

                <div className="mt-5">
                  <label className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                    Service config JSON
                  </label>
                  <textarea
                    value={service.configJson || ''}
                    onChange={(event) => updateService(service.id, { configJson: event.target.value })}
                    rows={4}
                    placeholder='{"supportingDocumentsTable":"ClientSupportingDocuments"}'
                    className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3 font-mono text-sm"
                  />
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {service.sections.map((section) => (
                    <div key={section.id} className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-[var(--foreground)]">{section.name}</h4>
                          <p className="mt-1 text-xs text-[var(--muted)]">{section.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={section.isEnabled}
                          onChange={(event) => updateSection(service.id, section.id, { isEnabled: event.target.checked })}
                        />
                      </div>
                      <textarea
                        value={section.configJson || ''}
                        onChange={(event) => updateSection(service.id, section.id, { configJson: event.target.value })}
                        rows={3}
                        placeholder='{"rollout":"beta"}'
                        className="mt-4 w-full rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </AdminShell>
    </ProtectedRoute>
  );
}
