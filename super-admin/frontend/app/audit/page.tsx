'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../components/AdminShell';
import { ProtectedRoute } from '../components/ProtectedRoute';

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

  useEffect(() => {
    void fetch('/api/admin/audit-logs?limit=100', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load audit logs');
        }
        return response.json();
      })
      .then((payload) => setLogs(payload as AuditLogRecord[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load audit logs'));
  }, []);

  return (
    <ProtectedRoute>
      <AdminShell>
        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Audit</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">Change history</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Review administrative changes, sign-ins, and policy updates across the client governance plane.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--surface-border)] text-[var(--muted)]">
                    <th className="pb-3 pr-4">Action</th>
                    <th className="pb-3 pr-4">Entity</th>
                    <th className="pb-3 pr-4">Actor</th>
                    <th className="pb-3 pr-4">Summary</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.Id} className="border-b border-[var(--surface-border)]/70 align-top">
                      <td className="py-3 pr-4 font-medium text-[var(--foreground)]">{log.Action}</td>
                      <td className="py-3 pr-4 text-[var(--muted-strong)]">
                        {log.EntityType}
                        {log.EntityKey ? ` / ${log.EntityKey}` : ''}
                      </td>
                      <td className="py-3 pr-4 text-[var(--muted)]">{log.UserEmail || 'system'}</td>
                      <td className="py-3 pr-4 text-[var(--muted)]">
                        <p>{log.Summary}</p>
                        {log.PayloadJson && (
                          <pre className="mt-2 overflow-x-auto rounded-2xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--muted)]">
                            {log.PayloadJson}
                          </pre>
                        )}
                      </td>
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
