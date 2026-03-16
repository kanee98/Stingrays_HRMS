'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '../components/AdminShell';
import { ProtectedRoute } from '../components/ProtectedRoute';
import {
  cn,
  formatActionLabel,
  formatDateTime,
  formatRelativeDate,
  formatStatusLabel,
  getActionBadgeClasses,
  getStatusBadgeClasses,
} from '../lib/adminUi';

interface DashboardResponse {
  summary: {
    TotalClients: number;
    ActiveClients: number;
    TotalServices: number;
    EnabledServiceAssignments: number;
    EnabledSectionAssignments: number;
  };
  recentAuditLogs: Array<{
    Id: number;
    Action: string;
    EntityType: string;
    EntityKey: string | null;
    Summary: string;
    CreatedAt: string;
    UserEmail: string | null;
  }>;
}

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [overviewResponse, clientsResponse] = await Promise.all([
          fetch('/api/admin/dashboard/overview', { credentials: 'include' }),
          fetch('/api/admin/clients', { credentials: 'include' }),
        ]);

        if (!overviewResponse.ok) {
          throw new Error('Failed to load platform dashboard');
        }

        if (!clientsResponse.ok) {
          throw new Error('Failed to load tenant directory');
        }

        const [overviewPayload, clientsPayload] = await Promise.all([
          overviewResponse.json(),
          clientsResponse.json(),
        ]);

        if (!isMounted) {
          return;
        }

        setData(overviewPayload as DashboardResponse);
        setClients(clientsPayload as ClientRecord[]);
      } catch (err: unknown) {
        if (!isMounted) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load platform dashboard');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      { label: 'Total tenants', value: data.summary.TotalClients, helper: 'All provisioned workspaces' },
      { label: 'Live tenants', value: data.summary.ActiveClients, helper: 'Currently operating in active state' },
      { label: 'Product grants', value: data.summary.EnabledServiceAssignments, helper: 'Enabled product assignments' },
      { label: 'Feature grants', value: data.summary.EnabledSectionAssignments, helper: 'Enabled module assignments' },
    ];
  }, [data]);

  const statusSummary = useMemo(() => {
    return clients.reduce<Record<string, number>>((summary, client) => {
      const status = client.Status.toLowerCase();
      summary[status] = (summary[status] || 0) + 1;
      return summary;
    }, {});
  }, [clients]);

  const attentionQueue = useMemo(() => {
    return clients
      .filter((client) => client.Status !== 'active' || client.MaintenanceMessage || !client.ContactEmail)
      .sort((left, right) => {
        const leftPriority = Number(Boolean(left.MaintenanceMessage)) + Number(left.Status !== 'active') + Number(!left.ContactEmail);
        const rightPriority =
          Number(Boolean(right.MaintenanceMessage)) + Number(right.Status !== 'active') + Number(!right.ContactEmail);
        return rightPriority - leftPriority;
      })
      .slice(0, 5);
  }, [clients]);

  const rolloutLeaders = useMemo(() => {
    return [...clients]
      .sort((left, right) => {
        if (right.EnabledSections !== left.EnabledSections) {
          return right.EnabledSections - left.EnabledSections;
        }

        return right.EnabledServices - left.EnabledServices;
      })
      .slice(0, 5);
  }, [clients]);

  const maintenanceCount = clients.filter((client) => client.MaintenanceMessage).length;
  const missingOwnerCount = clients.filter((client) => !client.ContactEmail).length;
  const coverageRate =
    data && data.summary.TotalClients > 0 && data.summary.TotalServices > 0
      ? Math.round(
          (data.summary.EnabledServiceAssignments / (data.summary.TotalClients * data.summary.TotalServices)) * 100,
        )
      : 0;

  return (
    <ProtectedRoute>
      <AdminShell>
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
            <section className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Platform Dashboard</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">Operational visibility for tenant governance</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                Review platform rollout, track tenant lifecycle states, and identify the next operational actions from a
                single control center.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-[var(--surface-muted)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Catalog Coverage</p>
                  <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{coverageRate}%</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">Percentage of available products assigned across tenants.</p>
                </div>
                <div className="rounded-3xl bg-[var(--surface-muted)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Maintenance Flags</p>
                  <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{maintenanceCount}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">Tenants currently showing an operator message.</p>
                </div>
                <div className="rounded-3xl bg-[var(--surface-muted)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Missing Owners</p>
                  <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{missingOwnerCount}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">Tenants without a primary contact email.</p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Quick Actions</p>
              <div className="mt-5 space-y-4">
                <QuickAction
                  href="/clients"
                  title="Provision a tenant"
                  body="Create a new workspace, assign the operating status, and set its primary contact details."
                />
                <QuickAction
                  href="/clients"
                  title="Review access rollout"
                  body="Open the tenant directory and adjust product or module access policies before launch."
                />
                <QuickAction
                  href="/audit"
                  title="Inspect recent changes"
                  body="Review admin sign-ins and the latest tenant or access policy mutations in the audit trail."
                />
              </div>
            </section>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
                <p className="text-sm text-[var(--muted)]">{card.label}</p>
                <p className="mt-3 text-4xl font-semibold text-[var(--foreground)]">{card.value}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{card.helper}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Lifecycle overview</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Tenant distribution by operating status.</p>
                </div>
                <Link href="/clients" className="text-sm font-semibold text-[var(--primary)]">
                  Open tenant directory
                </Link>
              </div>

              <div className="mt-6 space-y-4">
                {['active', 'pilot', 'inactive', 'suspended'].map((status) => {
                  const count = statusSummary[status] || 0;
                  const percentage = clients.length > 0 ? Math.round((count / clients.length) * 100) : 0;

                  return (
                    <div key={status} className="rounded-3xl bg-[var(--surface-muted)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                            getStatusBadgeClasses(status),
                          )}
                        >
                          {formatStatusLabel(status)}
                        </span>
                        <span className="text-sm font-semibold text-[var(--foreground)]">{count}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white">
                        <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${percentage}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted)]">{percentage}% of tenant portfolio</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Attention queue</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Tenants that need an operational follow-up.</p>
                </div>
                <Link href="/clients" className="text-sm font-semibold text-[var(--primary)]">
                  Review tenants
                </Link>
              </div>

              <div className="mt-6 space-y-4">
                {attentionQueue.length === 0 && (
                  <div className="rounded-3xl bg-[var(--surface-muted)] px-4 py-5 text-sm text-[var(--muted)]">
                    No tenants are currently flagged for operator review.
                  </div>
                )}

                {attentionQueue.map((client) => (
                  <Link
                    key={client.Id}
                    href={`/clients/${client.Id}`}
                    className="block rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4 transition hover:border-[var(--primary)]"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold text-[var(--foreground)]">{client.Name}</p>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                          getStatusBadgeClasses(client.Status),
                        )}
                      >
                        {formatStatusLabel(client.Status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {client.ContactEmail || 'Primary contact missing'} | {client.EnabledServices} products |{' '}
                      {client.EnabledSections} modules
                    </p>
                    {(client.MaintenanceMessage || client.Status !== 'active') && (
                      <p className="mt-3 text-sm text-[var(--muted-strong)]">
                        {client.MaintenanceMessage || 'Tenant is not in active operating state.'}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Top rollout coverage</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Tenants with the broadest product and module enablement.</p>
                </div>
                <Link href="/clients" className="text-sm font-semibold text-[var(--primary)]">
                  Manage rollout
                </Link>
              </div>

              <div className="mt-6 space-y-4">
                {rolloutLeaders.map((client, index) => (
                  <div key={client.Id} className="rounded-3xl bg-[var(--surface-muted)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                          Rank {index + 1}
                        </p>
                        <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{client.Name}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{client.ClientKey}</p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                          getStatusBadgeClasses(client.Status),
                        )}
                      >
                        {formatStatusLabel(client.Status)}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Products enabled</p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{client.EnabledServices}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Modules enabled</p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{client.EnabledSections}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Recent platform activity</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Latest privileged sign-ins and tenant governance changes.</p>
                </div>
                <Link href="/audit" className="text-sm font-semibold text-[var(--primary)]">
                  View full audit trail
                </Link>
              </div>

              <div className="mt-6 space-y-4">
                {isLoading && !data && (
                  <div className="rounded-3xl bg-[var(--surface-muted)] px-4 py-5 text-sm text-[var(--muted)]">
                    Loading platform activity...
                  </div>
                )}

                {data?.recentAuditLogs.map((log) => (
                  <div key={log.Id} className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                          getActionBadgeClasses(log.Action),
                        )}
                      >
                        {formatActionLabel(log.Action)}
                      </span>
                      <span className="text-sm font-medium text-[var(--muted-strong)]">{log.EntityType}</span>
                    </div>
                    <p className="mt-3 text-sm text-[var(--muted-strong)]">{log.Summary}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
                      <span>Actor: {log.UserEmail || 'System'}</span>
                      <span>When: {formatRelativeDate(log.CreatedAt)}</span>
                      <span>{formatDateTime(log.CreatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </AdminShell>
    </ProtectedRoute>
  );
}

function QuickAction({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="block rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-5 transition hover:border-[var(--primary)] hover:bg-white"
    >
      <p className="text-base font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
    </Link>
  );
}
