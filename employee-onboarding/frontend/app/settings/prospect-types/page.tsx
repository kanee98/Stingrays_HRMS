'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@shared/components/Button';
import { EmptyState } from '@shared/components/EmptyState';
import { Field } from '@shared/components/Field';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { StatusBadge } from '@shared/components/StatusBadge';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { inputClasses, inlineActionClasses, selectClasses, tableBodyRowClasses, tableHeaderRowClasses, textareaClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { DashboardLayout } from '../../components/DashboardLayout';

const API_URL = getEmployeeApiUrl();

interface ProspectType {
  Id: number;
  Name: string;
  SortOrder: number;
  IsActive: boolean;
  ImportLayoutKey: string | null;
}

interface ImportTemplate {
  Id: number;
  TemplateKey: string;
  Name: string;
  Description: string | null;
  SortOrder: number;
  IsActive: boolean;
  ScreeningColumnNumbers: number[];
  DefaultQuestionLabels: string[];
  CityAreaColumnNumber: number | null;
  FullNameColumnNumber: number | null;
  PhoneColumnNumber: number | null;
  EmailColumnNumber: number | null;
  GenderColumnNumber: number | null;
  DateOfBirthColumnNumber: number | null;
}

interface ScreeningQuestionRow {
  id: string;
  columnNumber: string;
  questionLabel: string;
  isAutoSuggested: boolean;
}

interface TemplateFormState {
  name: string;
  description: string;
  sortOrder: string;
  screeningQuestions: ScreeningQuestionRow[];
  cityAreaColumnNumber: string;
  fullNameColumnNumber: string;
  phoneColumnNumber: string;
  emailColumnNumber: string;
  genderColumnNumber: string;
  dateOfBirthColumnNumber: string;
}

const emptyTemplateForm: TemplateFormState = {
  name: '',
  description: '',
  sortOrder: '0',
  screeningQuestions: [],
  cityAreaColumnNumber: '',
  fullNameColumnNumber: '',
  phoneColumnNumber: '',
  emailColumnNumber: '',
  genderColumnNumber: '',
  dateOfBirthColumnNumber: '',
};

let screeningQuestionRowSeed = 0;

function createScreeningQuestionRow(
  columnNumber = '',
  questionLabel = '',
  isAutoSuggested = false
): ScreeningQuestionRow {
  screeningQuestionRowSeed += 1;

  return {
    id: `screening-question-${screeningQuestionRowSeed}`,
    columnNumber,
    questionLabel,
    isAutoSuggested,
  };
}

function sanitizeColumnNumberInput(value: string): string {
  const digitsOnly = value.replace(/[^\d]/g, '');
  const normalized = digitsOnly.replace(/^0+/, '');
  return normalized;
}

function getNextSuggestedColumnNumber(value: string): string {
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return '';
  }

  return String(parsed + 1);
}

function normalizeScreeningQuestionRows(rows: ScreeningQuestionRow[]): ScreeningQuestionRow[] {
  const manualRows = rows
    .filter((row) => !row.isAutoSuggested)
    .map((row) => ({
      ...row,
      columnNumber: sanitizeColumnNumberInput(row.columnNumber),
      questionLabel: row.questionLabel,
      isAutoSuggested: false,
    }));

  if (manualRows.length === 0) {
    return [createScreeningQuestionRow()];
  }

  const lastManualRow = manualRows[manualRows.length - 1];
  const hasConfiguredColumn = !!lastManualRow.columnNumber;

  if (!hasConfiguredColumn) {
    return manualRows;
  }

  return [
    ...manualRows,
    createScreeningQuestionRow(getNextSuggestedColumnNumber(lastManualRow.columnNumber), '', true),
  ];
}

function buildScreeningQuestionRows(template: ImportTemplate | null): ScreeningQuestionRow[] {
  if (!template || template.ScreeningColumnNumbers.length === 0) {
    return [createScreeningQuestionRow()];
  }

  return normalizeScreeningQuestionRows(
    template.ScreeningColumnNumbers.map((columnNumber, index) =>
      createScreeningQuestionRow(String(columnNumber), template.DefaultQuestionLabels[index] ?? '')
    )
  );
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && ((error as Error).message === 'Failed to fetch' || (error as Error).message?.includes('fetch'));
}

function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (isNetworkError(error)) {
    return API_URL.startsWith('/')
      ? 'Cannot connect to the employee API. Ensure the employee-onboarding API is running.'
      : `Cannot connect to the API at ${API_URL}. Make sure the employee-onboarding API is running.`;
  }
  return error instanceof Error ? error.message : fallback;
}

function toTemplateFormState(template: ImportTemplate | null): TemplateFormState {
  if (!template) {
    return {
      ...emptyTemplateForm,
      screeningQuestions: [createScreeningQuestionRow()],
    };
  }

  return {
    name: template.Name,
    description: template.Description ?? '',
    sortOrder: String(template.SortOrder ?? 0),
    screeningQuestions: buildScreeningQuestionRows(template),
    cityAreaColumnNumber: template.CityAreaColumnNumber == null ? '' : String(template.CityAreaColumnNumber),
    fullNameColumnNumber: template.FullNameColumnNumber == null ? '' : String(template.FullNameColumnNumber),
    phoneColumnNumber: template.PhoneColumnNumber == null ? '' : String(template.PhoneColumnNumber),
    emailColumnNumber: template.EmailColumnNumber == null ? '' : String(template.EmailColumnNumber),
    genderColumnNumber: template.GenderColumnNumber == null ? '' : String(template.GenderColumnNumber),
    dateOfBirthColumnNumber: template.DateOfBirthColumnNumber == null ? '' : String(template.DateOfBirthColumnNumber),
  };
}

function toTemplatePayload(form: TemplateFormState) {
  const configuredScreeningQuestions = form.screeningQuestions
    .filter((row) => !row.isAutoSuggested && row.columnNumber.trim())
    .map((row) => ({
      columnNumber: row.columnNumber.trim(),
      questionLabel: row.questionLabel.trim(),
    }));

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    sortOrder: form.sortOrder.trim(),
    screeningColumnNumbers: configuredScreeningQuestions.map((row) => row.columnNumber),
    defaultQuestionLabels: configuredScreeningQuestions.map((row) => row.questionLabel),
    cityAreaColumnNumber: form.cityAreaColumnNumber.trim(),
    fullNameColumnNumber: form.fullNameColumnNumber.trim(),
    phoneColumnNumber: form.phoneColumnNumber.trim(),
    emailColumnNumber: form.emailColumnNumber.trim(),
    genderColumnNumber: form.genderColumnNumber.trim(),
    dateOfBirthColumnNumber: form.dateOfBirthColumnNumber.trim(),
  };
}

function formatColumnReference(columnNumber: number | null): string {
  return columnNumber == null ? 'Not mapped' : `C${columnNumber}`;
}

function formatColumnList(columnNumbers: number[]): string {
  return columnNumbers.length > 0 ? columnNumbers.map((columnNumber) => `C${columnNumber}`).join(', ') : 'None';
}

function getTemplateDescription(template: ImportTemplate | null | undefined): string {
  return template?.Description || 'Imported spreadsheets will use this template mapping.';
}

export default function ProspectTypesSettingsPage() {
  const [prospectTypes, setProspectTypes] = useState<ProspectType[]>([]);
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeImportLayoutKey, setNewTypeImportLayoutKey] = useState('');
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [editTypeImportLayoutKey, setEditTypeImportLayoutKey] = useState('');
  const [savingType, setSavingType] = useState(false);

  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(() => toTemplateFormState(null));
  const [savingTemplate, setSavingTemplate] = useState(false);

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError('');
      const [prospectTypesResponse, templatesResponse] = await Promise.all([
        fetch(`${API_URL}/api/settings/prospect-types/all`),
        fetch(`${API_URL}/api/settings/prospect-import-templates/all`),
      ]);

      if (!prospectTypesResponse.ok) {
        throw new Error('Failed to load prospect types');
      }

      if (!templatesResponse.ok) {
        throw new Error('Failed to load import templates');
      }

      const [prospectTypesData, templatesData] = await Promise.all([
        prospectTypesResponse.json(),
        templatesResponse.json(),
      ]);

      setProspectTypes(Array.isArray(prospectTypesData) ? prospectTypesData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
    } catch (fetchError) {
      setError(getRequestErrorMessage(fetchError, 'Failed to load prospect type settings.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(true);
  }, []);

  const activeTemplates = templates.filter((template) => template.IsActive);

  const getTemplateByKey = (templateKey: string | null) => {
    if (!templateKey) return null;
    return templates.find((template) => template.TemplateKey === templateKey) || null;
  };

  const getTemplateOptions = (currentTemplateKey: string | null = null) => {
    return templates.filter((template) => template.IsActive || template.TemplateKey === currentTemplateKey);
  };

  const resetTemplateForm = () => {
    setEditingTemplateId(null);
    setTemplateForm({
      ...toTemplateFormState(null),
      sortOrder: String(templates.length),
    });
  };

  const handleCreateProspectType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTypeName.trim()) return;

    setSavingType(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/settings/prospect-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTypeName.trim(),
          sortOrder: prospectTypes.length,
          importLayoutKey: newTypeImportLayoutKey || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to create prospect type');
      }

      setNewTypeName('');
      setNewTypeImportLayoutKey('');
      setMessage('Prospect type created.');
      await fetchData();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Failed to create prospect type.'));
    } finally {
      setSavingType(false);
    }
  };

  const startEditProspectType = (row: ProspectType) => {
    setEditingTypeId(row.Id);
    setEditTypeName(row.Name);
    setEditTypeImportLayoutKey(row.ImportLayoutKey ?? '');
  };

  const cancelEditProspectType = () => {
    setEditingTypeId(null);
    setEditTypeName('');
    setEditTypeImportLayoutKey('');
  };

  const handleUpdateProspectType = async () => {
    if (editingTypeId == null || !editTypeName.trim()) return;

    setSavingType(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/settings/prospect-types/${editingTypeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editTypeName.trim(),
          importLayoutKey: editTypeImportLayoutKey || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to update prospect type');
      }

      cancelEditProspectType();
      setMessage('Prospect type updated.');
      await fetchData();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Failed to update prospect type.'));
    } finally {
      setSavingType(false);
    }
  };

  const handleDeactivateProspectType = async (id: number) => {
    if (!window.confirm('Deactivate this prospect type? It will no longer appear for new prospects or Excel imports.')) return;

    setSavingType(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/settings/prospect-types/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to deactivate prospect type');
      }

      if (editingTypeId === id) {
        cancelEditProspectType();
      }

      setMessage('Prospect type deactivated.');
      await fetchData();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Failed to deactivate prospect type.'));
    } finally {
      setSavingType(false);
    }
  };

  const startEditTemplate = (template: ImportTemplate) => {
    setEditingTemplateId(template.Id);
    setTemplateForm(toTemplateFormState(template));
  };

  const updateScreeningQuestionRow = (
    rowId: string,
    updates: Partial<Pick<ScreeningQuestionRow, 'columnNumber' | 'questionLabel'>>
  ) => {
    setTemplateForm((current) => ({
      ...current,
      screeningQuestions: normalizeScreeningQuestionRows(
        current.screeningQuestions.map((row) => {
          if (row.id !== rowId) {
            return row;
          }

          return {
            ...row,
            ...updates,
            columnNumber: updates.columnNumber !== undefined ? sanitizeColumnNumberInput(updates.columnNumber) : row.columnNumber,
            questionLabel: updates.questionLabel !== undefined ? updates.questionLabel : row.questionLabel,
            isAutoSuggested: false,
          };
        })
      ),
    }));
  };

  const addScreeningQuestionRow = () => {
    setTemplateForm((current) => ({
      ...current,
      screeningQuestions: normalizeScreeningQuestionRows([
        ...current.screeningQuestions.map((row, index, rows) => (
          index === rows.length - 1 ? { ...row, isAutoSuggested: false } : row
        )),
        createScreeningQuestionRow(),
      ]),
    }));
  };

  const removeScreeningQuestionRow = (rowId: string) => {
    setTemplateForm((current) => ({
      ...current,
      screeningQuestions: normalizeScreeningQuestionRows(
        current.screeningQuestions.filter((row) => row.id !== rowId)
      ),
    }));
  };

  const handleTemplateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!templateForm.name.trim()) return;

    setSavingTemplate(true);
    setError('');
    setMessage('');

    try {
      const isEditing = editingTemplateId != null;
      const response = await fetch(
        isEditing
          ? `${API_URL}/api/settings/prospect-import-templates/${editingTemplateId}`
          : `${API_URL}/api/settings/prospect-import-templates`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toTemplatePayload(templateForm)),
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'create'} import template`);
      }

      resetTemplateForm();
      setMessage(isEditing ? 'Import template updated.' : 'Import template created.');
      await fetchData();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Failed to save import template.'));
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeactivateTemplate = async (template: ImportTemplate) => {
    if (!window.confirm(`Deactivate "${template.Name}"? Prospect types mapped to it will no longer be able to import Excel files.`)) return;

    setSavingTemplate(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/settings/prospect-import-templates/${template.Id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to deactivate import template');
      }

      if (editingTemplateId === template.Id) {
        resetTemplateForm();
      }

      setMessage('Import template deactivated.');
      await fetchData();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Failed to deactivate import template.'));
    } finally {
      setSavingTemplate(false);
    }
  };

  useEffect(() => {
    if (!editingTemplateId && templateForm.name === '' && templateForm.sortOrder === '0' && templates.length > 0) {
      setTemplateForm((current) => ({
        ...current,
        sortOrder: String(templates.length),
      }));
    }
  }, [editingTemplateId, templateForm.name, templateForm.sortOrder, templates.length]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            eyebrow="Onboarding Settings"
            title="Prospect types"
            description="Manage the prospect type catalog and define the Excel import templates those types can use."
          />

          {error ? <NoticeBanner tone="error" message={error} /> : null}
          {message ? <NoticeBanner tone="success" message={message} /> : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.3fr)]">
            <SectionCard eyebrow="Create" title="Add prospect type" description="Create a prospect type and optionally map it to an active Excel import template.">
              <form onSubmit={handleCreateProspectType} className="space-y-4">
                <Field label="Prospect type name" htmlFor="newProspectType" required>
                  <input
                    id="newProspectType"
                    type="text"
                    value={newTypeName}
                    onChange={(event) => setNewTypeName(event.target.value)}
                    placeholder="Lifeguard"
                    className={inputClasses}
                  />
                </Field>

                <Field
                  label="Excel import template"
                  htmlFor="newImportLayout"
                  hint={newTypeImportLayoutKey ? getTemplateDescription(getTemplateByKey(newTypeImportLayoutKey)) : 'Leave this as manual entry only if this type will not be imported from Excel.'}
                >
                  <select
                    id="newImportLayout"
                    value={newTypeImportLayoutKey}
                    onChange={(event) => setNewTypeImportLayoutKey(event.target.value)}
                    className={selectClasses}
                  >
                    <option value="">Manual entry only</option>
                    {activeTemplates.map((template) => (
                      <option key={template.TemplateKey} value={template.TemplateKey}>{template.Name}</option>
                    ))}
                  </select>
                </Field>

                <div className="flex justify-end">
                  <Button type="submit" disabled={savingType || !newTypeName.trim()}>
                    {savingType ? 'Saving...' : 'Add prospect type'}
                  </Button>
                </div>
              </form>
            </SectionCard>

            <SectionCard eyebrow="Reference Table" title="Prospect types" description="Edit the prospect type labels used across the pipeline and control which types remain available for new work.">
              {loading ? (
                <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">Loading prospect types...</div>
              ) : prospectTypes.length === 0 ? (
                <EmptyState title="No prospect types configured" description="Add a prospect type to make it available in the onboarding pipeline." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className={tableHeaderRowClasses}>
                        <th className="pb-3 pr-4">Name</th>
                        <th className="pb-3 pr-4">Import template</th>
                        <th className="pb-3 pr-4">Order</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prospectTypes.map((row) => {
                        const rowTemplate = getTemplateByKey(row.ImportLayoutKey);

                        return (
                          <tr key={row.Id} className={tableBodyRowClasses}>
                            <td className="py-4 pr-4">
                              {editingTypeId === row.Id ? (
                                <input type="text" value={editTypeName} onChange={(event) => setEditTypeName(event.target.value)} className={inputClasses} />
                              ) : (
                                <span className="font-medium text-[var(--foreground)]">{row.Name}</span>
                              )}
                            </td>
                            <td className="py-4 pr-4 text-[var(--muted)]">
                              {editingTypeId === row.Id ? (
                                <select value={editTypeImportLayoutKey} onChange={(event) => setEditTypeImportLayoutKey(event.target.value)} className={selectClasses}>
                                  <option value="">Manual entry only</option>
                                  {getTemplateOptions(row.ImportLayoutKey).map((template) => (
                                    <option key={template.TemplateKey} value={template.TemplateKey}>{template.Name}</option>
                                  ))}
                                </select>
                              ) : rowTemplate ? (
                                <div className="space-y-1">
                                  <div>{rowTemplate.Name}</div>
                                  {!rowTemplate.IsActive ? <div className="text-xs text-amber-700">Inactive template</div> : null}
                                </div>
                              ) : (
                                'Manual entry only'
                              )}
                            </td>
                            <td className="py-4 pr-4 text-[var(--muted)]">{row.SortOrder}</td>
                            <td className="py-4 pr-4">
                              <StatusBadge label={row.IsActive ? 'Active' : 'Inactive'} tone={row.IsActive ? 'success' : 'neutral'} />
                            </td>
                            <td className="py-4 text-right">
                              {editingTypeId === row.Id ? (
                                <div className="flex justify-end gap-3">
                                  <button type="button" onClick={() => void handleUpdateProspectType()} disabled={savingType || !editTypeName.trim()} className={inlineActionClasses}>Save</button>
                                  <button type="button" onClick={cancelEditProspectType} className={inlineActionClasses}>Cancel</button>
                                </div>
                              ) : row.IsActive ? (
                                <div className="flex justify-end gap-3">
                                  <button type="button" onClick={() => startEditProspectType(row)} className={inlineActionClasses}>Edit</button>
                                  <button type="button" onClick={() => void handleDeactivateProspectType(row.Id)} disabled={savingType} className="text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50">Deactivate</button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(360px,1fr)_minmax(0,1.35fr)]">
            <SectionCard
              eyebrow={editingTemplateId == null ? 'Create' : 'Edit'}
              title={editingTemplateId == null ? 'Add Excel import template' : 'Edit Excel import template'}
              description="Define 1-based Excel column mappings for screening answers and candidate profile fields. Prospect types can then be assigned to these templates."
              actions={editingTemplateId != null ? <Button variant="secondary" onClick={resetTemplateForm} disabled={savingTemplate}>Cancel edit</Button> : undefined}
            >
              <form onSubmit={handleTemplateSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Template name" htmlFor="templateName" required>
                    <input
                      id="templateName"
                      type="text"
                      value={templateForm.name}
                      onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Call Center Screening Template"
                      className={inputClasses}
                    />
                  </Field>

                  <Field label="Sort order" htmlFor="templateSortOrder" hint="Lower values appear first in the prospect type template selector.">
                    <input
                      id="templateSortOrder"
                      type="number"
                      min="0"
                      step="1"
                      value={templateForm.sortOrder}
                      onChange={(event) => setTemplateForm((current) => ({ ...current, sortOrder: event.target.value }))}
                      className={inputClasses}
                    />
                  </Field>
                </div>

                <Field label="Description" htmlFor="templateDescription" hint="Optional context shown when this template is selected for a prospect type.">
                  <textarea
                    id="templateDescription"
                    rows={3}
                    value={templateForm.description}
                    onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="7 screening questions, candidate name, phone, email, date of birth, and gender."
                    className={textareaClasses}
                  />
                </Field>

                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--muted-strong)]">
                        Screening questions
                        <span className="ml-1 text-red-500">*</span>
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                        Add one screening question per row. Entering a column number in the last row automatically suggests the next column, so sequential mappings can be filled quickly.
                      </p>
                    </div>
                    <Button type="button" variant="secondary" onClick={addScreeningQuestionRow}>
                      Add row
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {templateForm.screeningQuestions.map((row, index) => (
                      <div
                        key={row.id}
                        className={`rounded-[24px] border p-4 ${row.isAutoSuggested ? 'border-dashed border-[var(--primary)]/35 bg-[var(--primary-muted)]/60' : 'border-[var(--surface-border)] bg-[var(--surface-muted)]'}`}
                      >
                        <div className="grid gap-4 lg:grid-cols-[140px_minmax(0,1fr)_auto]">
                          <div>
                            <label htmlFor={`screeningColumn-${row.id}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                              Question {index + 1}
                            </label>
                            <input
                              id={`screeningColumn-${row.id}`}
                              type="text"
                              inputMode="numeric"
                              value={row.columnNumber}
                              onChange={(event) => updateScreeningQuestionRow(row.id, { columnNumber: event.target.value })}
                              placeholder="Column #"
                              className={inputClasses}
                            />
                            <p className="mt-2 text-xs text-[var(--muted)]">
                              {row.isAutoSuggested ? 'Suggested next column' : '1-based Excel column number'}
                            </p>
                          </div>

                          <div>
                            <label htmlFor={`screeningLabel-${row.id}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                              Fallback label
                            </label>
                            <input
                              id={`screeningLabel-${row.id}`}
                              type="text"
                              value={row.questionLabel}
                              onChange={(event) => updateScreeningQuestionRow(row.id, { questionLabel: event.target.value })}
                              placeholder="Optional question text used when Excel headers are generic"
                              className={inputClasses}
                            />
                            <p className="mt-2 text-xs text-[var(--muted)]">
                              Leave blank to use the spreadsheet header for this screening answer.
                            </p>
                          </div>

                          <div className="flex items-start justify-end">
                            {row.isAutoSuggested ? (
                              <span className="inline-flex rounded-full border border-[var(--primary)]/25 bg-white/80 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                                Auto-filled
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => removeScreeningQuestionRow(row.id)}
                                disabled={templateForm.screeningQuestions.length === 1}
                                className="text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Full name column" htmlFor="fullNameColumn" required>
                    <input
                      id="fullNameColumn"
                      type="number"
                      min="1"
                      step="1"
                      value={templateForm.fullNameColumnNumber}
                      onChange={(event) => setTemplateForm((current) => ({ ...current, fullNameColumnNumber: event.target.value }))}
                      className={inputClasses}
                    />
                  </Field>

                  <Field label="Phone column" htmlFor="phoneColumn" required>
                    <input
                      id="phoneColumn"
                      type="number"
                      min="1"
                      step="1"
                      value={templateForm.phoneColumnNumber}
                      onChange={(event) => setTemplateForm((current) => ({ ...current, phoneColumnNumber: event.target.value }))}
                      className={inputClasses}
                    />
                  </Field>

                  <Field label="City or area column" htmlFor="cityAreaColumn">
                    <input
                      id="cityAreaColumn"
                      type="number"
                      min="1"
                      step="1"
                      value={templateForm.cityAreaColumnNumber}
                      onChange={(event) => setTemplateForm((current) => ({ ...current, cityAreaColumnNumber: event.target.value }))}
                      className={inputClasses}
                    />
                  </Field>

                  <Field label="Email column" htmlFor="emailColumn">
                    <input
                      id="emailColumn"
                      type="number"
                      min="1"
                      step="1"
                      value={templateForm.emailColumnNumber}
                      onChange={(event) => setTemplateForm((current) => ({ ...current, emailColumnNumber: event.target.value }))}
                      className={inputClasses}
                    />
                  </Field>

                  <Field label="Gender column" htmlFor="genderColumn">
                    <input
                      id="genderColumn"
                      type="number"
                      min="1"
                      step="1"
                      value={templateForm.genderColumnNumber}
                      onChange={(event) => setTemplateForm((current) => ({ ...current, genderColumnNumber: event.target.value }))}
                      className={inputClasses}
                    />
                  </Field>

                  <Field label="Date of birth column" htmlFor="dateOfBirthColumn">
                    <input
                      id="dateOfBirthColumn"
                      type="number"
                      min="1"
                      step="1"
                      value={templateForm.dateOfBirthColumnNumber}
                      onChange={(event) => setTemplateForm((current) => ({ ...current, dateOfBirthColumnNumber: event.target.value }))}
                      className={inputClasses}
                    />
                  </Field>
                </div>

                <div className="flex justify-end gap-3">
                  {editingTemplateId != null ? (
                    <Button type="button" variant="secondary" onClick={resetTemplateForm} disabled={savingTemplate}>
                      Cancel
                    </Button>
                  ) : null}
                  <Button type="submit" disabled={savingTemplate || !templateForm.name.trim()}>
                    {savingTemplate ? 'Saving...' : editingTemplateId == null ? 'Add template' : 'Save template'}
                  </Button>
                </div>
              </form>
            </SectionCard>

            <SectionCard eyebrow="Reference Table" title="Excel import templates" description="Create and maintain the Excel layouts used to import prospects. Column numbers are stored exactly as users see them in Excel: column 1 is A, column 2 is B, and so on.">
              {loading ? (
                <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">Loading import templates...</div>
              ) : templates.length === 0 ? (
                <EmptyState title="No import templates configured" description="Create a template to make Excel-based prospect imports configurable from this page." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className={tableHeaderRowClasses}>
                        <th className="pb-3 pr-4">Template</th>
                        <th className="pb-3 pr-4">Screening</th>
                        <th className="pb-3 pr-4">Field mapping</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((template) => (
                        <tr key={template.Id} className={tableBodyRowClasses}>
                          <td className="py-4 pr-4">
                            <div className="space-y-1">
                              <div className="font-medium text-[var(--foreground)]">{template.Name}</div>
                              <div className="text-xs text-[var(--muted)]">{template.TemplateKey}</div>
                              {template.Description ? <div className="text-xs text-[var(--muted)]">{template.Description}</div> : null}
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-[var(--muted)]">
                            <div className="space-y-1">
                              <div>{formatColumnList(template.ScreeningColumnNumbers)}</div>
                              {template.DefaultQuestionLabels.some(Boolean) ? (
                                <div className="text-xs">Default labels: {template.DefaultQuestionLabels.filter(Boolean).length}</div>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <div className="space-y-1 text-xs text-[var(--muted)]">
                              <div>Full name: {formatColumnReference(template.FullNameColumnNumber)}</div>
                              <div>Phone: {formatColumnReference(template.PhoneColumnNumber)}</div>
                              <div>Email: {formatColumnReference(template.EmailColumnNumber)}</div>
                              <div>City or area: {formatColumnReference(template.CityAreaColumnNumber)}</div>
                              <div>Gender: {formatColumnReference(template.GenderColumnNumber)}</div>
                              <div>Date of birth: {formatColumnReference(template.DateOfBirthColumnNumber)}</div>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <div className="space-y-2">
                              <StatusBadge label={template.IsActive ? 'Active' : 'Inactive'} tone={template.IsActive ? 'success' : 'neutral'} />
                              <div className="text-xs text-[var(--muted)]">Order: {template.SortOrder}</div>
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            {template.IsActive ? (
                              <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => startEditTemplate(template)} className={inlineActionClasses}>Edit</button>
                                <button type="button" onClick={() => void handleDeactivateTemplate(template)} disabled={savingTemplate} className="text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50">Deactivate</button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => startEditTemplate(template)} className={inlineActionClasses}>View</button>
                            )}
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
