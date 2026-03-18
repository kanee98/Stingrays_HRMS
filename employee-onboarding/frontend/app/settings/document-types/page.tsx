'use client';

import { useState, useEffect, useCallback } from 'react';
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

const DOCUMENT_FIELD_TYPES = ['text', 'tel', 'date', 'file'] as const;
type DocumentFieldType = (typeof DOCUMENT_FIELD_TYPES)[number];

/** Gramasevaka-style template: name, office, phone, certificate number, date, file */
const GRAMASEVAKA_TEMPLATE_FIELDS: { fieldKey: string; label: string; fieldType: DocumentFieldType; isRequired: boolean }[] = [
  { fieldKey: 'name', label: 'Name', fieldType: 'text', isRequired: true },
  { fieldKey: 'office', label: 'Office', fieldType: 'text', isRequired: true },
  { fieldKey: 'phone', label: 'Phone', fieldType: 'tel', isRequired: true },
  { fieldKey: 'certificate_number', label: 'Certificate number', fieldType: 'text', isRequired: true },
  { fieldKey: 'certificate_date', label: 'Certificate date', fieldType: 'date', isRequired: true },
  { fieldKey: 'document_file', label: 'Document file', fieldType: 'file', isRequired: true },
];

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

interface DocumentTypeField {
  Id: number;
  DocumentTypeId: number;
  FieldKey: string;
  Label: string;
  FieldType: string;
  IsRequired: boolean;
  SortOrder: number;
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
  const [managingFieldsId, setManagingFieldsId] = useState<number | null>(null);
  const [fields, setFields] = useState<DocumentTypeField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<DocumentFieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [editFieldKey, setEditFieldKey] = useState('');
  const [editFieldLabel, setEditFieldLabel] = useState('');
  const [editFieldType, setEditFieldType] = useState<DocumentFieldType>('text');
  const [editFieldRequired, setEditFieldRequired] = useState(false);

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

  const openManageFields = useCallback(async (documentTypeId: number) => {
    setManagingFieldsId(documentTypeId);
    setEditingFieldId(null);
    setFields([]);
    setFieldsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/document-types/${documentTypeId}/fields`);
      if (!res.ok) throw new Error('Failed to load fields');
      const data = await res.json();
      setFields(Array.isArray(data) ? data : []);
    } catch {
      setFields([]);
    } finally {
      setFieldsLoading(false);
    }
    setNewFieldKey('');
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldRequired(false);
  }, []);

  const fetchFieldsForManaging = useCallback(async () => {
    if (managingFieldsId == null) return;
    setFieldsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/document-types/${managingFieldsId}/fields`);
      if (!res.ok) throw new Error('Failed to load fields');
      const data = await res.json();
      setFields(Array.isArray(data) ? data : []);
    } catch {
      setFields([]);
    } finally {
      setFieldsLoading(false);
    }
  }, [managingFieldsId]);

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (managingFieldsId == null || !newFieldKey.trim() || !newFieldLabel.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/settings/document-types/${managingFieldsId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldKey: newFieldKey.trim(),
          label: newFieldLabel.trim(),
          fieldType: newFieldType,
          isRequired: newFieldRequired,
          sortOrder: fields.length,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add field');
      }
      setNewFieldKey('');
      setNewFieldLabel('');
      setNewFieldRequired(false);
      await fetchFieldsForManaging();
      setMessage('Field added.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add field');
    } finally {
      setSaving(false);
    }
  };

  const startEditField = (field: DocumentTypeField) => {
    setEditingFieldId(field.Id);
    setEditFieldKey(field.FieldKey);
    setEditFieldLabel(field.Label);
    setEditFieldType(field.FieldType as DocumentFieldType);
    setEditFieldRequired(!!field.IsRequired);
  };

  const cancelEditField = () => {
    setEditingFieldId(null);
    setEditFieldKey('');
    setEditFieldLabel('');
    setEditFieldType('text');
    setEditFieldRequired(false);
  };

  const handleUpdateField = async () => {
    if (editingFieldId == null || !editFieldLabel.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/settings/document-types/fields/${editingFieldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editFieldLabel.trim(),
          fieldKey: editFieldKey.trim() || undefined,
          fieldType: editFieldType,
          isRequired: editFieldRequired,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update field');
      }
      cancelEditField();
      await fetchFieldsForManaging();
      setMessage('Field updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update field');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (fieldId: number) => {
    if (!window.confirm('Remove this field from the document type?')) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/settings/document-types/fields/${fieldId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete field');
      await fetchFieldsForManaging();
      setMessage('Field removed.');
      if (editingFieldId === fieldId) cancelEditField();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete field');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTemplate = async () => {
    if (managingFieldsId == null) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      for (let i = 0; i < GRAMASEVAKA_TEMPLATE_FIELDS.length; i++) {
        const f = GRAMASEVAKA_TEMPLATE_FIELDS[i];
        const res = await fetch(`${API_URL}/api/settings/document-types/${managingFieldsId}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fieldKey: f.fieldKey,
            label: f.label,
            fieldType: f.fieldType,
            isRequired: f.isRequired,
            sortOrder: i,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to add template field');
        }
      }
      await fetchFieldsForManaging();
      setMessage('Gramasevaka-style template fields added.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load template');
    } finally {
      setSaving(false);
    }
  };

  const managingDocTypeName = list.find((t) => t.Id === managingFieldsId)?.Name ?? '';

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
                        <th className="pb-3 pr-4">Fields</th>
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
                          <td className="py-4 pr-4">
                            {row.IsActive ? (
                              <button type="button" onClick={() => void openManageFields(row.Id)} className={inlineActionClasses}>
                                Manage fields
                              </button>
                            ) : null}
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

          {managingFieldsId != null ? (
            <SectionCard
              eyebrow="Document type fields"
              title={`Fields for: ${managingDocTypeName}`}
              description="Define the fields shown when an employee fills this document type. Use the Gramasevaka-style template as a starting point or add custom fields (text, tel, date, file)."
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="secondary" onClick={() => void handleLoadTemplate()} disabled={saving || fieldsLoading}>
                    Load Gramasevaka template
                  </Button>
                  <span className="text-sm text-[var(--muted)]">Adds: Name, Office, Phone, Certificate number/date, Document file</span>
                  <button type="button" onClick={() => { setManagingFieldsId(null); cancelEditField(); }} className={inlineActionClasses}>Close</button>
                </div>
                <form onSubmit={handleAddField} className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
                  <div className="min-w-[140px]">
                    <Field label="Field key" htmlFor="newFieldKey">
                      <input id="newFieldKey" type="text" value={newFieldKey} onChange={(e) => setNewFieldKey(e.target.value)} placeholder="e.g. certificate_number" className={inputClasses} />
                    </Field>
                  </div>
                  <div className="min-w-[140px]">
                    <Field label="Label" htmlFor="newFieldLabel">
                      <input id="newFieldLabel" type="text" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="e.g. Certificate number" className={inputClasses} />
                    </Field>
                  </div>
                  <Field label="Type" htmlFor="newFieldType">
                    <select id="newFieldType" value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as DocumentFieldType)} className={inputClasses}>
                      {DOCUMENT_FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} className={checkboxClasses} />
                    Required
                  </label>
                  <Button type="submit" disabled={saving || !newFieldKey.trim() || !newFieldLabel.trim()}>{saving ? 'Adding...' : 'Add field'}</Button>
                </form>
                {fieldsLoading ? (
                  <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">Loading fields...</div>
                ) : fields.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No fields yet. Add fields above or load the Gramasevaka template.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className={tableHeaderRowClasses}>
                          <th className="pb-3 pr-4">Key</th>
                          <th className="pb-3 pr-4">Label</th>
                          <th className="pb-3 pr-4">Type</th>
                          <th className="pb-3 pr-4">Required</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((f) => (
                          <tr key={f.Id} className={tableBodyRowClasses}>
                            <td className="py-2 pr-4 font-mono text-[var(--muted)]">
                              {editingFieldId === f.Id ? (
                                <input type="text" value={editFieldKey} onChange={(e) => setEditFieldKey(e.target.value)} placeholder="Field key" className={inputClasses} />
                              ) : (
                                f.FieldKey
                              )}
                            </td>
                            <td className="py-2 pr-4">
                              {editingFieldId === f.Id ? (
                                <input type="text" value={editFieldLabel} onChange={(e) => setEditFieldLabel(e.target.value)} placeholder="Label" className={inputClasses} />
                              ) : (
                                f.Label
                              )}
                            </td>
                            <td className="py-2 pr-4 text-[var(--muted)]">
                              {editingFieldId === f.Id ? (
                                <select value={editFieldType} onChange={(e) => setEditFieldType(e.target.value as DocumentFieldType)} className={inputClasses}>
                                  {DOCUMENT_FIELD_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              ) : (
                                f.FieldType
                              )}
                            </td>
                            <td className="py-2 pr-4">
                              {editingFieldId === f.Id ? (
                                <input type="checkbox" checked={editFieldRequired} onChange={(e) => setEditFieldRequired(e.target.checked)} className={checkboxClasses} />
                              ) : f.IsRequired ? (
                                'Yes'
                              ) : (
                                'No'
                              )}
                            </td>
                            <td className="py-2 text-right">
                              {editingFieldId === f.Id ? (
                                <div className="flex justify-end gap-2">
                                  <button type="button" onClick={() => void handleUpdateField()} disabled={saving || !editFieldLabel.trim()} className={inlineActionClasses}>Save</button>
                                  <button type="button" onClick={cancelEditField} className={inlineActionClasses}>Cancel</button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-3">
                                  <button type="button" onClick={() => startEditField(f)} className={inlineActionClasses}>Edit</button>
                                  <button type="button" onClick={() => void handleDeleteField(f.Id)} disabled={saving} className="text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50">Remove</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </SectionCard>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
