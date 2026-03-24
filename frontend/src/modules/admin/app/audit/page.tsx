'use client';

import { useDeferredValue, useEffect, useRef, useState } from 'react';
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

interface AuditLogListResponse {
  items: AuditLogRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    total: number;
    signIns: number;
    tenantChanges: number;
    systemEvents: number;
  };
  filters: {
    actions: string[];
    entities: string[];
  };
}

const emptySummary = {
  total: 0,
  signIns: 0,
  tenantChanges: 0,
  systemEvents: 0,
};

export default function AuditPage() {
  const [data, setData] = useState<AuditLogListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const hasLoadedDataRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadLogs = async () => {
      if (hasLoadedDataRef.current) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });

        const trimmedSearchQuery = deferredSearchQuery.trim();
        if (trimmedSearchQuery.length > 0) {
          params.set('search', trimmedSearchQuery);
        }

        if (actionFilter !== 'all') {
          params.set('action', actionFilter);
        }

        if (entityFilter !== 'all') {
          params.set('entity', entityFilter);
        }

        const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load audit trail');
        }

        const payload = (await response.json()) as AuditLogListResponse;
        hasLoadedDataRef.current = true;
        setData(payload);

        if (payload.page !== page) {
          setPage(payload.page);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load audit trail');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadLogs();

    return () => {
      controller.abort();
    };
  }, [actionFilter, deferredSearchQuery, entityFilter, page, pageSize]);

  const summary = data?.summary ?? emptySummary;
  const logs = data?.items ?? [];
  const currentPage = data?.page ?? page;
  const currentPageSize = data?.pageSize ?? pageSize;
  const totalPages = data?.totalPages ?? 1;
  const startRecord = summary.total === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;
  const endRecord = summary.total === 0 ? 0 : Math.min(startRecord + logs.length - 1, summary.total);
  const isFilterPending = searchQuery.trim() !== deferredSearchQuery.trim();

  return (
    <ProtectedRoute>
      <AdminShell>
        <div className="flex min-h-full flex-col gap-6">
          <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Audit Trail</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">Privileged activity and change history</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Review operator sign-ins, tenant lifecycle changes, and access policy updates. The activity stream stays
              paginated and bounded so review remains fast as the audit ledger grows.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AuditMetric label="Matching events" value={summary.total} helper="Results across the current filter set" />
            <AuditMetric label="Sign-in activity" value={summary.signIns} helper="Login and logout events in scope" />
            <AuditMetric label="Tenant changes" value={summary.tenantChanges} helper="Tenant and access mutations in scope" />
            <AuditMetric label="System events" value={summary.systemEvents} helper="Events without a signed-in actor" />
          </div>

          <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_160px]">
              <div>
                <label htmlFor="audit-search" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                  Search activity
                </label>
                <input
                  id="audit-search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
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
                  onChange={(event) => {
                    setActionFilter(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                >
                  <option value="all">All actions</option>
                  {(data?.filters.actions ?? []).map((action) => (
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
                  onChange={(event) => {
                    setEntityFilter(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                >
                  <option value="all">All entities</option>
                  {(data?.filters.entities ?? []).map((entity) => (
                    <option key={entity} value={entity}>
                      {formatEntityLabel(entity)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="audit-page-size" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                  Rows per page
                </label>
                <select
                  id="audit-page-size"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--muted)] lg:flex-row lg:items-center lg:justify-between">
              <p>
                Showing {startRecord}-{endRecord} of {summary.total} matching events.
              </p>
              <p>Newest activity appears first. Filters and pagination are applied server-side.</p>
            </div>
          </div>

          <section className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow)]">
            <div className="flex flex-col gap-4 border-b border-[var(--surface-border)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Activity stream</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Review the current page without stretching the full route height.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted-strong)]">
                  Page {currentPage} of {totalPages}
                </span>
                {(isRefreshing || isFilterPending) && (
                  <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                    Updating results...
                  </span>
                )}
              </div>
            </div>

            {isLoading && !data && (
              <div className="px-6 py-10 text-sm text-[var(--muted)]">Loading audit trail...</div>
            )}

            {!isLoading && data && logs.length === 0 && (
              <div className="px-6 py-10 text-sm text-[var(--muted)]">No audit events match the current filters.</div>
            )}

            {logs.length > 0 && (
              <>
                <div className="max-h-[min(68vh,56rem)] overflow-y-auto overscroll-contain">
                  <div className="space-y-4 p-6">
                    {logs.map((log) => (
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
                              {log.EntityKey && <span className="text-sm text-[var(--muted)]">Entity key: {log.EntityKey}</span>}
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

                <div className="flex flex-col gap-4 border-t border-[var(--surface-border)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-[var(--muted)]">
                    Showing {startRecord}-{endRecord} of {summary.total} events.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      disabled={currentPage <= 1 || isRefreshing}
                      className="rounded-xl border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      First
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={currentPage <= 1 || isRefreshing}
                      className="rounded-xl border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={currentPage >= totalPages || isRefreshing}
                      className="rounded-xl border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      disabled={currentPage >= totalPages || isRefreshing}
                      className="rounded-xl border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Last
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
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
