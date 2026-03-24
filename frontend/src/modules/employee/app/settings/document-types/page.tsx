'use client';

import { useState, useEffect } from 'react';
import { Button } from '@shared/components/Button';
import { EmptyState } from '@shared/components/EmptyState';
import { Field } from '@shared/components/Field';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { StatusBadge } from '@shared/components/StatusBadge';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { checkboxClasses, inputClasses, inlineActionClasses, tableBodyRowClasses, tableHeaderRowClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { DashboardLayout } from '../../components/DashboardLayout';

const API_URL = getEmployeeApiUrl();

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError && ((e as Error).message === 'Failed to fetch' || (e as Error).message?.includes('fetch'));
}

interface DocumentType {
  Id: number;
  Name: string;
  IsRequired: boolean;
  SortOrder: number;
  IsActive: boolean;
}

export default function DocumentTypesSettingsPage() {
  const [list, setList] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newName, setNewName] = useState('');
  const [newRequired, setNewRequired] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editRequired, setEditRequired] = useState(false);

  const fetchList = async () => {
    try {
      setError('');
      const res = await fetch(`${API_URL}/api/settings/document-types/all`);
      if (!res.ok) throw new Error('Failed to load document types');
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      if (isNetworkError(e)) {
        setError(
          API_URL.startsWith('/')
            ? 'Cannot connect to the employee API. Ensure the employee-onboarding API is running.'
            : `Cannot connect to the API at ${API_URL}. Make sure the employee-onboarding API is running.`
        );
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load document types.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/settings/document-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), isRequired: newRequired, sortOrder: list.length }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create document type');
      }
      setNewName('');
      setNewRequired(true);
      setMessage('Document type created.');
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create document type');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: DocumentType) => {
    setEditingId(row.Id);
    setEditName(row.Name);
    setEditRequired(!!row.IsRequired);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditRequired(false);
  };

  const handleUpdate = async () => {
    if (editingId == null || !editName.trim()) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/settings/document-types/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), isRequired: editRequired }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update document type');
      }
      cancelEdit();
      setMessage('Document type updated.');
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update document type');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm('Deactivate this document type? It will no longer appear in new onboarding checklists.')) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/settings/document-types/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to deactivate document type');
      setMessage('Document type deactivated.');
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to deactivate document type');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader eyebrow="Onboarding Settings" title="Document types" description="Manage which documents are requested during onboarding using the shared settings page framework." />

          {error ? <NoticeBanner tone="error" message={error} /> : null}
          {message ? <NoticeBanner tone="success" message={message} /> : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.3fr)]">
            <SectionCard eyebrow="Create" title="Add document type" description="Only active document types appear in the onboarding workflow.">
              <form onSubmit={handleCreate} className="space-y-4">
                <Field label="Document type name" htmlFor="newDocumentType" required>
                  <input id="newDocumentType" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Passport copy" className={inputClasses} />
                </Field>
                <label className="flex items-start gap-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted-strong)]">
                  <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} className={checkboxClasses} />
                  <span>
                    <span className="block font-medium text-[var(--foreground)]">Required upload</span>
                    New hires must provide this document before the workflow can complete.
                  </span>
                </label>
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving || !newName.trim()}>{saving ? 'Saving...' : 'Add document type'}</Button>
                </div>
              </form>
            </SectionCard>

            <SectionCard eyebrow="Reference Table" title="Document types" description="Edit or deactivate the upload categories used during onboarding.">
              {loading ? (
                <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">Loading document types...</div>
              ) : list.length === 0 ? (
                <EmptyState title="No document types configured" description="Add a document type to start collecting uploads during onboarding." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className={tableHeaderRowClasses}>
                        <th className="pb-3 pr-4">Name</th>
                        <th className="pb-3 pr-4">Required</th>
                        <th className="pb-3 pr-4">Order</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((row) => (
                        <tr key={row.Id} className={tableBodyRowClasses}>
                          <td className="py-4 pr-4">
                            {editingId === row.Id ? (
                              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClasses} />
                            ) : (
                              <span className="font-medium text-[var(--foreground)]">{row.Name}</span>
                            )}
                          </td>
                          <td className="py-4 pr-4 text-[var(--muted)]">
                            {editingId === row.Id ? (
                              <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} className={checkboxClasses} />
                            ) : row.IsRequired ? (
                              'Yes'
                            ) : (
                              'No'
                            )}
                          </td>
                          <td className="py-4 pr-4 text-[var(--muted)]">{row.SortOrder}</td>
                          <td className="py-4 pr-4">
                            <StatusBadge label={row.IsActive ? 'Active' : 'Inactive'} tone={row.IsActive ? 'success' : 'neutral'} />
                          </td>
                          <td className="py-4 text-right">
                            {editingId === row.Id ? (
                              <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => void handleUpdate()} disabled={saving || !editName.trim()} className={inlineActionClasses}>Save</button>
                                <button type="button" onClick={cancelEdit} className={inlineActionClasses}>Cancel</button>
                              </div>
                            ) : row.IsActive ? (
                              <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => startEdit(row)} className={inlineActionClasses}>Edit</button>
                                <button type="button" onClick={() => void handleDeactivate(row.Id)} disabled={saving} className="text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50">Deactivate</button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
