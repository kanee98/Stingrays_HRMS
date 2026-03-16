'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '../components/AdminShell';
import { ProtectedRoute } from '../components/ProtectedRoute';
import {
  cn,
  formatActionLabel,
  formatDateTime,
  formatEntityLabel,
  formatRelativeDate,
  getActionBadgeClasses,
} from '../lib/adminUi';

interface AuditLogRecord {
  Id: number;
  Action: string;
  EntityType: string;
  EntityKey: string | null;
  Summary: string;
  PayloadJson: string | null;
  CreatedAt: string;
  UserEmail: string | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState('100');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;

    const loadLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/audit-logs?limit=${limit}`, { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Failed to load audit trail');
        }

        const payload = (await response.json()) as AuditLogRecord[];
        if (isMounted) {
          setLogs(payload);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load audit trail');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadLogs();

    return () => {
      isMounted = false;
    };
  }, [limit]);

  const actionOptions = useMemo(() => {
    return [...new Set(logs.map((log) => log.Action))];
  }, [logs]);

  const entityOptions = useMemo(() => {
    return [...new Set(logs.map((log) => log.EntityType))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesAction = actionFilter === 'all' || log.Action === actionFilter;
      const matchesEntity = entityFilter === 'all' || log.EntityType === entityFilter;
      const matchesQuery =
        query.length === 0 ||
        [log.Summary, log.EntityKey || '', log.UserEmail || '', log.Action, log.EntityType]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return matchesAction && matchesEntity && matchesQuery;
    });
  }, [actionFilter, entityFilter, logs, searchQuery]);

  const summary = useMemo(() => {
    return {
      total: logs.length,
      signIns: logs.filter((log) => log.Action.includes('login') || log.Action.includes('logout')).length,
      tenantChanges: logs.filter((log) => log.Action.startsWith('client.')).length,
      systemEvents: logs.filter((log) => !log.UserEmail).length,
    };
  }, [logs]);

  return (
    <ProtectedRoute>
      <AdminShell>
        <div className="space-y-6">
          <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Audit Trail</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">Privileged activity and change history</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Review operator sign-ins, tenant lifecycle changes, and access policy updates. Use filters to isolate the
              event stream you need for governance or troubleshooting.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AuditMetric label="Loaded events" value={summary.total} helper="Events currently in memory" />
            <AuditMetric label="Sign-in activity" value={summary.signIns} helper="Login and logout events" />
            <AuditMetric label="Tenant changes" value={summary.tenantChanges} helper="Tenant profile or access mutations" />
            <AuditMetric label="System events" value={summary.systemEvents} helper="Events without a signed-in actor" />
          </div>

          <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_140px]">
              <div>
                <label htmlFor="audit-search" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                  Search activity
                </label>
                <input
                  id="audit-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by summary, actor, entity key, or action"
                  className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                />
              </div>

              <div>
                <label htmlFor="audit-action-filter" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                  Action
                </label>
                <select
                  id="audit-action-filter"
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                >
                  <option value="all">All actions</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {formatActionLabel(action)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="audit-entity-filter" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                  Entity
                </label>
                <select
                  id="audit-entity-filter"
                  value={entityFilter}
                  onChange={(event) => setEntityFilter(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                >
                  <option value="all">All entities</option>
                  {entityOptions.map((entity) => (
                    <option key={entity} value={entity}>
                      {formatEntityLabel(entity)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="audit-limit" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                  Load size
                </label>
                <select
                  id="audit-limit"
                  value={limit}
                  onChange={(event) => setLimit(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                >
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
            </div>

            <p className="mt-4 text-sm text-[var(--muted)]">
              Showing {filteredLogs.length} of {logs.length} loaded events.
            </p>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] px-6 py-10 text-sm text-[var(--muted)] shadow-[var(--shadow)]">
                Loading audit trail...
              </div>
            )}

            {!loading && filteredLogs.length === 0 && (
              <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] px-6 py-10 text-sm text-[var(--muted)] shadow-[var(--shadow)]">
                No audit events match the current filters.
              </div>
            )}

            {!loading &&
              filteredLogs.map((log) => (
                <article
                  key={log.Id}
                  className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                            getActionBadgeClasses(log.Action),
                          )}
                        >
                          {formatActionLabel(log.Action)}
                        </span>
                        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted-strong)]">
                          {formatEntityLabel(log.EntityType)}
                        </span>
                        {log.EntityKey && (
                          <span className="text-sm text-[var(--muted)]">Entity key: {log.EntityKey}</span>
                        )}
                      </div>
                      <p className="mt-4 text-base font-semibold text-[var(--foreground)]">{log.Summary}</p>
                    </div>

                    <div className="rounded-3xl bg-[var(--surface-muted)] px-4 py-4 text-sm text-[var(--muted-strong)]">
                      <p className="font-semibold text-[var(--foreground)]">{log.UserEmail || 'System'}</p>
                      <p className="mt-1 text-[var(--muted)]">{formatRelativeDate(log.CreatedAt)}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{formatDateTime(log.CreatedAt)}</p>
                    </div>
                  </div>

                  {log.PayloadJson && (
                    <details className="mt-5 rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-4">
                      <summary className="cursor-pointer text-sm font-semibold text-[var(--muted-strong)]">
                        View raw payload
                      </summary>
                      <pre className="mt-4 overflow-x-auto rounded-2xl bg-white p-4 text-xs text-[var(--muted-strong)]">
                        {log.PayloadJson}
                      </pre>
                    </details>
                  )}
                </article>
              ))}
          </div>
        </div>
      </AdminShell>
    </ProtectedRoute>
  );
}

function AuditMetric({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-[var(--foreground)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{helper}</p>
    </div>
  );
}
