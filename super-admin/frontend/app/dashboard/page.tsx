'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../components/AdminShell';
import { ProtectedRoute } from '../components/ProtectedRoute';

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/admin/dashboard/overview', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load overview');
        }
        return response.json();
      })
      .then((payload) => setData(payload as DashboardResponse))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load overview'));
  }, []);

  const cards = data
    ? [
        { label: 'Total clients', value: data.summary.TotalClients },
        { label: 'Active clients', value: data.summary.ActiveClients },
        { label: 'Service assignments', value: data.summary.EnabledServiceAssignments },
        { label: 'Section assignments', value: data.summary.EnabledSectionAssignments },
      ]
    : [];

  return (
    <ProtectedRoute>
      <AdminShell>
        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Overview</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">Tenant governance at a glance</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Monitor the current platform footprint, audit recent changes, and manage rollout decisions from this console.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
                <p className="text-sm text-[var(--muted)]">{card.label}</p>
                <p className="mt-3 text-4xl font-semibold text-[var(--foreground)]">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Recent audit activity</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Latest control-plane mutations and sign-ins.</p>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--surface-border)] text-[var(--muted)]">
                    <th className="pb-3 pr-4">Action</th>
                    <th className="pb-3 pr-4">Entity</th>
                    <th className="pb-3 pr-4">Summary</th>
                    <th className="pb-3 pr-4">Actor</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentAuditLogs.map((log) => (
                    <tr key={log.Id} className="border-b border-[var(--surface-border)]/70 align-top">
                      <td className="py-3 pr-4 font-medium text-[var(--foreground)]">{log.Action}</td>
                      <td className="py-3 pr-4 text-[var(--muted-strong)]">
                        {log.EntityType}
                        {log.EntityKey ? ` / ${log.EntityKey}` : ''}
                      </td>
                      <td className="py-3 pr-4 text-[var(--muted)]">{log.Summary}</td>
                      <td className="py-3 pr-4 text-[var(--muted)]">{log.UserEmail || 'system'}</td>
                      <td className="py-3 text-[var(--muted)]">{new Date(log.CreatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminShell>
    </ProtectedRoute>
  );
}
