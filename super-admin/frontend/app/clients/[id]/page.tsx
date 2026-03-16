'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '../../components/AdminShell';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import {
  cn,
  formatDateTime,
  formatJsonString,
  formatStatusLabel,
  getConfigState,
  getStatusBadgeClasses,
  isJsonStringValid,
} from '../../lib/adminUi';

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
  fetchedAt: string;
}

interface ClientProfile {
  Id: number;
  ClientKey: string;
  Name: string;
  Description: string | null;
  ContactEmail: string | null;
  Status: string;
  DefaultTimezone: string;
  MaintenanceMessage: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
}

interface VisibleService extends AccessService {
  visibleSections: AccessSection[];
}

export default function ClientAccessPage() {
  const params = useParams<{ id: string }>();
  const clientId = String(params.id);

  const [snapshot, setSnapshot] = useState<AccessSnapshot | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<AccessSnapshot | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedServices, setExpandedServices] = useState<Record<number, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    const loadAccessPage = async () => {
      setLoading(true);
      setError(null);

      try {
        const [accessResponse, profileResponse] = await Promise.all([
          fetch(`/api/admin/clients/${clientId}/access`, { credentials: 'include' }),
          fetch(`/api/admin/clients/${clientId}`, { credentials: 'include' }),
        ]);

        if (!accessResponse.ok) {
          throw new Error('Failed to load access policy');
        }

        if (!profileResponse.ok) {
          throw new Error('Failed to load tenant profile');
        }

        const [accessPayload, profilePayload] = await Promise.all([accessResponse.json(), profileResponse.json()]);

        if (!isMounted) {
          return;
        }

        const nextSnapshot = accessPayload as AccessSnapshot;
        setSnapshot(nextSnapshot);
        setInitialSnapshot(cloneSnapshot(nextSnapshot));
        setClientProfile(profilePayload as ClientProfile);
        setExpandedServices({});
        setExpandedSections({});
      } catch (err: unknown) {
        if (!isMounted) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load access policy');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadAccessPage();

    return () => {
      isMounted = false;
    };
  }, [clientId]);

  const updateService = (serviceId: number, changes: Partial<AccessService>) => {
    setNotice(null);
    setSnapshot((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        services: current.services.map((service) => (service.id === serviceId ? { ...service, ...changes } : service)),
      };
    });
  };

  const updateSection = (serviceId: number, sectionId: number, changes: Partial<AccessSection>) => {
    setNotice(null);
    setSnapshot((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        services: current.services.map((service) =>
          service.id === serviceId
            ? {
                ...service,
                sections: service.sections.map((section) =>
                  section.id === sectionId ? { ...section, ...changes } : section,
                ),
              }
            : service,
        ),
      };
    });
  };

  const loadDraftFromInitial = () => {
    if (!initialSnapshot) {
      return;
    }

    setNotice(null);
    setError(null);
    setSnapshot(cloneSnapshot(initialSnapshot));
    setExpandedServices({});
    setExpandedSections({});
  };

  const setAllServicesEnabled = (isEnabled: boolean) => {
    setNotice(null);
    setSnapshot((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        services: current.services.map((service) => ({ ...service, isEnabled })),
      };
    });
  };

  const setAllSectionsEnabledForService = (serviceId: number, isEnabled: boolean) => {
    setNotice(null);
    setSnapshot((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        services: current.services.map((service) =>
          service.id === serviceId
            ? {
                ...service,
                sections: service.sections.map((section) => ({ ...section, isEnabled })),
              }
            : service,
        ),
      };
    });
  };

  const toggleServiceAdvanced = (serviceId: number) => {
    setExpandedServices((current) => ({ ...current, [serviceId]: !current[serviceId] }));
  };

  const toggleSectionAdvanced = (sectionKey: string) => {
    setExpandedSections((current) => ({ ...current, [sectionKey]: !current[sectionKey] }));
  };

  const formatServiceJson = (service: AccessService) => {
    try {
      updateService(service.id, { configJson: formatJsonString(service.configJson) });
      setError(null);
    } catch {
      setError('Only valid JSON can be formatted.');
    }
  };

  const formatSectionJson = (serviceId: number, section: AccessSection) => {
    try {
      updateSection(serviceId, section.id, { configJson: formatJsonString(section.configJson) });
      setError(null);
    } catch {
      setError('Only valid JSON can be formatted.');
    }
  };

  const handleSave = async () => {
    if (!snapshot) {
      return;
    }

    const invalidService = snapshot.services.find((service) => !isJsonStringValid(service.configJson));
    const invalidSection = snapshot.services
      .flatMap((service) => service.sections)
      .find((section) => !isJsonStringValid(section.configJson));

    if (invalidService || invalidSection) {
      setError('Advanced rules must contain valid JSON or remain blank.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/clients/${clientId}/access`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createPolicyPayload(snapshot)),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || 'Failed to save access policy');
      }

      const nextSnapshot = cloneSnapshot(snapshot);
      nextSnapshot.fetchedAt = new Date().toISOString();
      setSnapshot(nextSnapshot);
      setInitialSnapshot(cloneSnapshot(nextSnapshot));
      setNotice('Access policy updated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save access policy');
    } finally {
      setSaving(false);
    }
  };

  const enabledServicesCount = snapshot?.services.filter((service) => service.isEnabled).length || 0;
  const totalServicesCount = snapshot?.services.length || 0;
  const totalSectionsCount = snapshot?.services.reduce((count, service) => count + service.sections.length, 0) || 0;
  const enabledSectionsCount =
    snapshot?.services.reduce(
      (count, service) => count + service.sections.filter((section) => section.isEnabled).length,
      0,
    ) || 0;
  const pendingChanges = countPolicyDifferences(snapshot, initialSnapshot);
  const hasUnsavedChanges = pendingChanges > 0;

  const visibleServices = useMemo(() => {
    if (!snapshot) {
      return [] as VisibleService[];
    }

    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return snapshot.services.map((service) => ({ ...service, visibleSections: service.sections }));
    }

    return snapshot.services.flatMap((service) => {
      const serviceMatches = [service.name, service.key, service.description || '']
        .join(' ')
        .toLowerCase()
        .includes(query);

      const visibleSections = service.sections.filter((section) =>
        [section.name, section.key, section.description || ''].join(' ').toLowerCase().includes(query),
      );

      if (!serviceMatches && visibleSections.length === 0) {
        return [];
      }

      return [
        {
          ...service,
          visibleSections: serviceMatches ? service.sections : visibleSections,
        },
      ];
    });
  }, [searchQuery, snapshot]);

  return (
    <ProtectedRoute>
      <AdminShell>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <Link href="/clients" className="text-sm font-semibold text-[var(--primary)]">
                Back to tenant directory
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Access Policy</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
                {snapshot?.client.name || clientProfile?.Name || 'Loading tenant...'}
              </h2>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {(snapshot?.client.status || clientProfile?.Status) && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                      getStatusBadgeClasses(snapshot?.client.status || clientProfile?.Status || 'inactive'),
                    )}
                  >
                    {formatStatusLabel(snapshot?.client.status || clientProfile?.Status || 'inactive')}
                  </span>
                )}
                <span className="text-sm text-[var(--muted)]">{clientProfile?.ContactEmail || 'Primary contact missing'}</span>
                <span className="text-sm text-[var(--muted)]">{clientProfile?.DefaultTimezone || 'Timezone not set'}</span>
                {snapshot?.fetchedAt && (
                  <span className="text-sm text-[var(--muted)]">Draft loaded {formatDateTime(snapshot.fetchedAt)}</span>
                )}
              </div>

              {clientProfile?.MaintenanceMessage && (
                <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  <p className="font-semibold">Maintenance notice</p>
                  <p className="mt-1 leading-6">{clientProfile.MaintenanceMessage}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !snapshot || !hasUnsavedChanges}
                className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : hasUnsavedChanges ? 'Save changes' : 'No changes to save'}
              </button>
              <button
                type="button"
                onClick={loadDraftFromInitial}
                disabled={!hasUnsavedChanges}
                className="rounded-2xl border border-[var(--surface-border)] px-5 py-3 text-sm font-medium text-[var(--muted-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Discard draft
              </button>
            </div>
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
            <PolicyMetric label="Products" value={totalServicesCount} helper="Available products in the catalog" />
            <PolicyMetric label="Products live" value={enabledServicesCount} helper="Products currently enabled" />
            <PolicyMetric label="Modules live" value={enabledSectionsCount} helper={`Out of ${totalSectionsCount} total modules`} />
            <PolicyMetric label="Pending changes" value={pendingChanges} helper="Unsaved product or module edits" />
          </div>

          <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <label htmlFor="policy-search" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                  Search products or modules
                </label>
                <input
                  id="policy-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by product name, product key, or module name"
                  className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <button
                  type="button"
                  onClick={() => setAllServicesEnabled(true)}
                  className="rounded-2xl border border-[var(--surface-border)] px-4 py-3 text-sm font-medium text-[var(--muted-strong)]"
                >
                  Enable all products
                </button>
                <button
                  type="button"
                  onClick={() => setAllServicesEnabled(false)}
                  className="rounded-2xl border border-[var(--surface-border)] px-4 py-3 text-sm font-medium text-[var(--muted-strong)]"
                >
                  Disable all products
                </button>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Use product toggles for customer-facing availability. Module toggles can be staged in advance, and advanced
              JSON rules are available for technical overrides only when needed.
            </p>
          </div>

          <div className="space-y-5">
            {loading && !snapshot && (
              <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] px-6 py-10 text-sm text-[var(--muted)] shadow-[var(--shadow)]">
                Loading access policy...
              </div>
            )}

            {!loading && visibleServices.length === 0 && (
              <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] px-6 py-10 text-sm text-[var(--muted)] shadow-[var(--shadow)]">
                No products or modules match the current search.
              </div>
            )}

            {visibleServices.map((service) => {
              const enabledSectionCount = service.sections.filter((section) => section.isEnabled).length;
              const serviceConfigState = getConfigState(service.configJson);
              const isServiceAdvancedOpen = expandedServices[service.id];

              return (
                <section
                  key={service.id}
                  className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-semibold text-[var(--foreground)]">{service.name}</h3>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                            service.isEnabled
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-100 text-slate-700',
                          )}
                        >
                          {service.isEnabled ? 'Product enabled' : 'Product disabled'}
                        </span>
                        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted-strong)]">
                          {enabledSectionCount}/{service.sections.length} modules live
                        </span>
                      </div>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                        {service.description || 'No product description is configured yet.'}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Product key: {service.key}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAllSectionsEnabledForService(service.id, true)}
                        className="rounded-2xl border border-[var(--surface-border)] px-4 py-3 text-sm font-medium text-[var(--muted-strong)]"
                      >
                        Enable all modules
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllSectionsEnabledForService(service.id, false)}
                        className="rounded-2xl border border-[var(--surface-border)] px-4 py-3 text-sm font-medium text-[var(--muted-strong)]"
                      >
                        Disable all modules
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceAdvanced(service.id)}
                        className="rounded-2xl border border-[var(--surface-border)] px-4 py-3 text-sm font-medium text-[var(--muted-strong)]"
                      >
                        {isServiceAdvancedOpen ? 'Hide advanced rule' : 'Advanced rule'}
                      </button>
                      <label className="inline-flex items-center gap-3 rounded-2xl border border-[var(--surface-border)] px-4 py-3">
                        <input
                          type="checkbox"
                          checked={service.isEnabled}
                          onChange={(event) => updateService(service.id, { isEnabled: event.target.checked })}
                        />
                        <span className="text-sm font-medium text-[var(--muted-strong)]">Customer access</span>
                      </label>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-[var(--muted)]">
                    Modules can be staged before the parent product is enabled, which is useful for controlled rollouts.
                  </p>

                  {isServiceAdvancedOpen && (
                    <div className="mt-5 rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">Advanced product rule</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            Optional JSON override for product-specific routing or platform flags.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                              serviceConfigState.classes,
                            )}
                          >
                            {serviceConfigState.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => formatServiceJson(service)}
                            className="rounded-2xl border border-[var(--surface-border)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)]"
                          >
                            Format JSON
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={service.configJson || ''}
                        onChange={(event) => updateService(service.id, { configJson: event.target.value })}
                        rows={5}
                        placeholder='{"featureFlag":"beta"}'
                        className="mt-4 w-full rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 font-mono text-sm"
                      />
                    </div>
                  )}

                  <div className="mt-6 grid gap-4 xl:grid-cols-2">
                    {service.visibleSections.map((section) => {
                      const sectionConfigState = getConfigState(section.configJson);
                      const sectionAdvancedKey = `${service.id}-${section.id}`;
                      const isSectionAdvancedOpen = expandedSections[sectionAdvancedKey];

                      return (
                        <article
                          key={section.id}
                          className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-5"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <h4 className="text-lg font-semibold text-[var(--foreground)]">{section.name}</h4>
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                                    section.isEnabled
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : 'border-slate-200 bg-slate-100 text-slate-700',
                                  )}
                                >
                                  {section.isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                                {section.description || 'No module description is configured yet.'}
                              </p>
                              <p className="mt-3 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                                Module key: {section.key}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleSectionAdvanced(sectionAdvancedKey)}
                                className="rounded-2xl border border-[var(--surface-border)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)]"
                              >
                                {isSectionAdvancedOpen ? 'Hide advanced rule' : 'Advanced rule'}
                              </button>
                              <label className="inline-flex items-center gap-3 rounded-2xl border border-[var(--surface-border)] px-4 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={section.isEnabled}
                                  onChange={(event) =>
                                    updateSection(service.id, section.id, { isEnabled: event.target.checked })
                                  }
                                />
                                <span className="text-sm font-medium text-[var(--muted-strong)]">Module access</span>
                              </label>
                            </div>
                          </div>

                          {isSectionAdvancedOpen && (
                            <div className="mt-5 rounded-3xl border border-[var(--surface-border)] bg-white p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-[var(--foreground)]">Advanced module rule</p>
                                  <p className="mt-1 text-sm text-[var(--muted)]">
                                    Optional JSON override for feature-level rollout or tenant-specific settings.
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <span
                                    className={cn(
                                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                                      sectionConfigState.classes,
                                    )}
                                  >
                                    {sectionConfigState.label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => formatSectionJson(service.id, section)}
                                    className="rounded-2xl border border-[var(--surface-border)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)]"
                                  >
                                    Format JSON
                                  </button>
                                </div>
                              </div>
                              <textarea
                                value={section.configJson || ''}
                                onChange={(event) =>
                                  updateSection(service.id, section.id, { configJson: event.target.value })
                                }
                                rows={4}
                                placeholder='{"rollout":"beta"}'
                                className="mt-4 w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3 font-mono text-sm"
                              />
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </AdminShell>
    </ProtectedRoute>
  );
}

function PolicyMetric({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-[var(--foreground)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{helper}</p>
    </div>
  );
}

function createPolicyPayload(snapshot: AccessSnapshot) {
  return {
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
  };
}

function countPolicyDifferences(current: AccessSnapshot | null, initial: AccessSnapshot | null) {
  if (!current || !initial) {
    return 0;
  }

  let differences = 0;
  const currentPayload = createPolicyPayload(current);
  const initialPayload = createPolicyPayload(initial);

  for (let index = 0; index < currentPayload.services.length; index += 1) {
    const currentService = currentPayload.services[index];
    const initialService = initialPayload.services[index];

    if (
      currentService?.isEnabled !== initialService?.isEnabled ||
      (currentService?.configJson || '') !== (initialService?.configJson || '')
    ) {
      differences += 1;
    }
  }

  for (let index = 0; index < currentPayload.sections.length; index += 1) {
    const currentSection = currentPayload.sections[index];
    const initialSection = initialPayload.sections[index];

    if (
      currentSection?.isEnabled !== initialSection?.isEnabled ||
      (currentSection?.configJson || '') !== (initialSection?.configJson || '')
    ) {
      differences += 1;
    }
  }

  return differences;
}

function cloneSnapshot(snapshot: AccessSnapshot) {
  return JSON.parse(JSON.stringify(snapshot)) as AccessSnapshot;
}
