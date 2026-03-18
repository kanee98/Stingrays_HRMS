'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@shared/components/Button';
import { EmptyState } from '@shared/components/EmptyState';
import { Field } from '@shared/components/Field';
import { MetricCard } from '@shared/components/MetricCard';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { StatusBadge } from '@shared/components/StatusBadge';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { inputClasses, inlineActionClasses, secondaryButtonClasses, selectClasses, tableBodyRowClasses, tableHeaderRowClasses, textareaClasses } from '@shared/lib/ui';

const API_URL = getEmployeeApiUrl();
const PAGE_SIZES = [10, 25, 50, 100];

interface Prospect {
  Id: number;
  FirstName: string;
  LastName: string;
  FullName: string | null;
  Email: string | null;
  CityArea: string | null;
  Phone: string | null;
  Gender: string | null;
  DateOfBirth: string | null;
  InterviewDate: string | null;
  InterviewTime: string | null;
  InterviewStatus: string | null;
  ProspectType: string | null;
  ConvertedToEmployeeId: number | null;
}

interface ProspectTypeOption {
  Id: number;
  Name: string;
  SortOrder: number;
  IsActive: boolean;
  ImportLayoutKey: string | null;
}

interface ProspectListResponse {
  data?: Prospect[];
  total?: number;
  totalPages?: number;
}

interface ScreeningAnswerDraft {
  question: string;
  answer: string;
}

interface ManualProspectForm {
  prospectType: string;
  fullName: string;
  phone: string;
  email: string;
  cityArea: string;
  gender: string;
  dateOfBirth: string;
  source: string;
  screeningAnswers: ScreeningAnswerDraft[];
}

function createEmptyScreeningAnswer(): ScreeningAnswerDraft {
  return { question: '', answer: '' };
}

function createInitialManualForm(prospectType = ''): ManualProspectForm {
  return {
    prospectType,
    fullName: '',
    phone: '',
    email: '',
    cityArea: '',
    gender: '',
    dateOfBirth: '',
    source: '',
    screeningAnswers: [createEmptyScreeningAnswer()],
  };
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

function getStatusTone(prospect: Prospect) {
  if (prospect.ConvertedToEmployeeId) return 'success' as const;
  if (prospect.InterviewStatus) return 'warning' as const;
  return 'neutral' as const;
}

function getStatusLabel(prospect: Prospect) {
  if (prospect.ConvertedToEmployeeId) return 'Onboarding';
  if (prospect.InterviewStatus) return prospect.InterviewStatus;
  return 'Unscheduled';
}

export function ProspectsClient() {
  const [data, setData] = useState<Prospect[]>([]);
  const [prospectTypes, setProspectTypes] = useState<ProspectTypeOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typesLoading, setTypesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [configError, setConfigError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [typeFilter, setTypeFilter] = useState('');
  const [uploadProspectType, setUploadProspectType] = useState('');
  const [manualForm, setManualForm] = useState<ManualProspectForm>(() => createInitialManualForm());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualEntryRef = useRef<HTMLDivElement>(null);

  const importableProspectTypes = prospectTypes.filter((item) => !!item.ImportLayoutKey);

  const fetchProspects = useCallback(async (next?: { page?: number; limit?: number; typeFilter?: string }) => {
    const nextPage = next?.page ?? page;
    const nextLimit = next?.limit ?? limit;
    const nextTypeFilter = next?.typeFilter ?? typeFilter;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: String(nextLimit), sort: 'CreatedAt', order: 'desc' });
      if (nextTypeFilter) params.set('type', nextTypeFilter);
      const res = await fetch(`${API_URL}/api/prospects?${params.toString()}`);
      const json = (await res.json().catch(() => ({}))) as ProspectListResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to load prospects');
      setData(Array.isArray(json.data) ? json.data : []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
      setLoadError('');
    } catch (error) {
      setData([]);
      setTotal(0);
      setTotalPages(1);
      setLoadError(getRequestErrorMessage(error, 'Failed to load prospects.'));
    } finally {
      setLoading(false);
    }
  }, [limit, page, typeFilter]);

  const fetchProspectTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/prospect-types`);
      const result = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error((result as { error?: string }).error || 'Failed to load prospect types');
      const list = Array.isArray(result) ? result as ProspectTypeOption[] : [];
      setProspectTypes(list);
      setConfigError('');
      setManualForm((current) => list.some((item) => item.Name === current.prospectType) || list.length === 0 ? current : { ...current, prospectType: list[0].Name });
      setUploadProspectType((current) => {
        const valid = list.some((item) => !!item.ImportLayoutKey && item.Name === current);
        if (valid) return current;
        return list.find((item) => !!item.ImportLayoutKey)?.Name ?? '';
      });
    } catch (error) {
      setProspectTypes([]);
      setConfigError(getRequestErrorMessage(error, 'Failed to load prospect types.'));
    } finally {
      setTypesLoading(false);
    }
  }, []);

  useEffect(() => { void fetchProspects(); }, [fetchProspects]);
  useEffect(() => { void fetchProspectTypes(); }, [fetchProspectTypes]);

  useEffect(() => {
    if (manualForm.prospectType || prospectTypes.length === 0) return;
    setManualForm((current) => ({ ...current, prospectType: prospectTypes[0].Name }));
  }, [manualForm.prospectType, prospectTypes]);

  useEffect(() => {
    if (uploadProspectType || importableProspectTypes.length === 0) return;
    setUploadProspectType(importableProspectTypes[0].Name);
  }, [importableProspectTypes, uploadProspectType]);

  const setManualField = <K extends Exclude<keyof ManualProspectForm, 'screeningAnswers'>>(field: K, value: ManualProspectForm[K]) => {
    setManualForm((current) => ({ ...current, [field]: value }));
  };

  const setScreeningField = (index: number, field: keyof ScreeningAnswerDraft, value: string) => {
    setManualForm((current) => ({
      ...current,
      screeningAnswers: current.screeningAnswers.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const addScreeningAnswer = () => {
    setManualForm((current) => ({ ...current, screeningAnswers: [...current.screeningAnswers, createEmptyScreeningAnswer()] }));
  };

  const removeScreeningAnswer = (index: number) => {
    setManualForm((current) => ({
      ...current,
      screeningAnswers: current.screeningAnswers.length <= 1
        ? [createEmptyScreeningAnswer()]
        : current.screeningAnswers.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const resetManualForm = () => {
    setManualForm(createInitialManualForm(prospectTypes[0]?.Name || ''));
  };

  const handleManualCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualForm.prospectType) {
      setActionError('Add an active prospect type in settings before creating prospects.');
      setActionSuccess('');
      return;
    }
    setCreating(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm),
      });
      const result = (await res.json().catch(() => ({}))) as Prospect & { error?: string };
      if (!res.ok) throw new Error(result.error || 'Failed to create prospect');
      const createdType = result.ProspectType || manualForm.prospectType;
      const nextTypeFilter = typeFilter && typeFilter !== createdType ? createdType : typeFilter;
      if (page !== 1) setPage(1);
      if (nextTypeFilter !== typeFilter) setTypeFilter(nextTypeFilter);
      setSelectedIds(new Set());
      resetManualForm();
      setActionSuccess('Prospect created.');
      await fetchProspects({ page: 1, typeFilter: nextTypeFilter });
    } catch (error) {
      setActionError(getRequestErrorMessage(error, 'Failed to create prospect.'));
    } finally {
      setCreating(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!uploadProspectType) {
      setActionError('Configure at least one import-enabled prospect type before uploading Excel files.');
      setActionSuccess('');
      event.target.value = '';
      return;
    }
    setActionError('');
    setActionSuccess('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prospectType', uploadProspectType);
      const res = await fetch(`${API_URL}/api/prospects/upload`, { method: 'POST', body: formData });
      const result = (await res.json().catch(() => ({}))) as { error?: string; message?: string; count?: number };
      if (!res.ok) throw new Error(result.error || 'Upload failed');
      const nextTypeFilter = typeFilter && typeFilter !== uploadProspectType ? uploadProspectType : typeFilter;
      if (page !== 1) setPage(1);
      if (nextTypeFilter !== typeFilter) setTypeFilter(nextTypeFilter);
      setActionSuccess(result.message || `${result.count} prospect(s) imported.`);
      setSelectedIds(new Set());
      await fetchProspects({ page: 1, typeFilter: nextTypeFilter });
    } catch (error) {
      setActionError(getRequestErrorMessage(error, 'Failed to upload Excel file.'));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === data.length ? new Set() : new Set(data.map((item) => item.Id)));
  };

  const handleDeleteOne = async (id: number) => {
    if (!window.confirm('Delete this prospect?')) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/prospects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || 'Delete failed');
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setActionSuccess('Prospect deleted.');
      await fetchProspects();
    } catch (error) {
      setActionError(getRequestErrorMessage(error, 'Delete failed.'));
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setActionError('Select at least one prospect.');
      setActionSuccess('');
      return;
    }
    if (!window.confirm(`Delete ${ids.length} selected prospect(s)?`)) return;
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/prospects/delete-selected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Delete failed');
      setSelectedIds(new Set());
      setActionSuccess(result.message || 'Selected prospects deleted.');
      await fetchProspects();
    } catch (error) {
      setActionError(getRequestErrorMessage(error, 'Delete failed.'));
    }
  };

  const displayName = (prospect: Prospect) => prospect.FullName?.trim() || [prospect.FirstName, prospect.LastName].filter(Boolean).join(' ') || 'Unnamed prospect';
  const onboardingCount = data.filter((prospect) => prospect.ConvertedToEmployeeId).length;

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
      <PageHeader
        eyebrow="Prospect Pipeline"
        title="Prospects"
        description="Add prospects manually, import bulk spreadsheets, and move qualified candidates into onboarding from one shared workspace."
        actions={<div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => manualEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Add prospect</Button>
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading || importableProspectTypes.length === 0}>{uploading ? 'Uploading...' : 'Import Excel'}</Button>
        </div>}
      />
      {loadError ? <NoticeBanner tone="error" message={loadError} /> : null}
      {configError ? <NoticeBanner tone="error" message={configError} /> : null}
      {actionError ? <NoticeBanner tone="error" message={actionError} /> : null}
      {actionSuccess ? <NoticeBanner tone="success" message={actionSuccess} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div ref={manualEntryRef}>
          <SectionCard eyebrow="Create" title="Add prospect manually" description="Capture a candidate directly without waiting for an Excel upload and keep the record in the same onboarding pipeline.">
            {typesLoading ? (
              <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">Loading prospect types...</div>
            ) : prospectTypes.length === 0 ? (
              <div className="space-y-4">
                <NoticeBanner tone="warning" message="No active prospect types are configured. Add one before creating prospects." />
                <Link href="/settings/prospect-types" className={secondaryButtonClasses}>Open prospect type settings</Link>
              </div>
            ) : (
              <form onSubmit={handleManualCreate} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Prospect type" htmlFor="manualProspectType" required>
                    <select id="manualProspectType" value={manualForm.prospectType} onChange={(event) => setManualField('prospectType', event.target.value)} className={selectClasses}>
                      {prospectTypes.map((item) => <option key={item.Id} value={item.Name}>{item.Name}</option>)}
                    </select>
                  </Field>
                  <Field label="Full name" htmlFor="manualFullName" required>
                    <input id="manualFullName" type="text" value={manualForm.fullName} onChange={(event) => setManualField('fullName', event.target.value)} placeholder="Ashan Perera" className={inputClasses} />
                  </Field>
                  <Field label="Phone" htmlFor="manualPhone" required={!manualForm.email.trim()} hint="Provide at least one contact method.">
                    <input id="manualPhone" type="tel" value={manualForm.phone} onChange={(event) => setManualField('phone', event.target.value)} placeholder="+94 77 123 4567" className={inputClasses} />
                  </Field>
                  <Field label="Email" htmlFor="manualEmail" required={!manualForm.phone.trim()} hint="A valid email is required only if provided.">
                    <input id="manualEmail" type="email" value={manualForm.email} onChange={(event) => setManualField('email', event.target.value)} placeholder="candidate@example.com" className={inputClasses} />
                  </Field>
                  <Field label="City / area" htmlFor="manualCityArea">
                    <input id="manualCityArea" type="text" value={manualForm.cityArea} onChange={(event) => setManualField('cityArea', event.target.value)} placeholder="Colombo 05" className={inputClasses} />
                  </Field>
                  <Field label="Gender" htmlFor="manualGender">
                    <input id="manualGender" type="text" value={manualForm.gender} onChange={(event) => setManualField('gender', event.target.value)} placeholder="Female" className={inputClasses} />
                  </Field>
                  <Field label="Date of birth" htmlFor="manualDateOfBirth">
                    <input id="manualDateOfBirth" type="date" value={manualForm.dateOfBirth} onChange={(event) => setManualField('dateOfBirth', event.target.value)} className={inputClasses} />
                  </Field>
                  <Field label="Source" htmlFor="manualSource" hint="Optional recruiting channel such as referral, walk-in, or LinkedIn.">
                    <input id="manualSource" type="text" value={manualForm.source} onChange={(event) => setManualField('source', event.target.value)} placeholder="Referral" className={inputClasses} />
                  </Field>
                </div>

                <div className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">Screening answers</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">Optional. Capture question and answer pairs if the candidate was pre-screened before being added.</p>
                    </div>
                    <Button type="button" variant="secondary" onClick={addScreeningAnswer}>Add question</Button>
                  </div>
                  <div className="mt-4 space-y-4">
                    {manualForm.screeningAnswers.map((item, index) => (
                      <div key={`${index}-${manualForm.screeningAnswers.length}`} className="grid gap-4 rounded-[20px] border border-[var(--surface-border)] bg-[var(--surface)] p-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_auto] md:items-start">
                        <Field label={`Question ${index + 1}`} htmlFor={`manualQuestion-${index}`}>
                          <input id={`manualQuestion-${index}`} type="text" value={item.question} onChange={(event) => setScreeningField(index, 'question', event.target.value)} placeholder="Why do you want this role?" className={inputClasses} />
                        </Field>
                        <Field label="Answer" htmlFor={`manualAnswer-${index}`}>
                          <textarea id={`manualAnswer-${index}`} rows={3} value={item.answer} onChange={(event) => setScreeningField(index, 'answer', event.target.value)} placeholder="Candidate response" className={textareaClasses} />
                        </Field>
                        <div className="flex justify-end md:pt-8">
                          <Button type="button" variant="secondary" onClick={() => removeScreeningAnswer(index)} disabled={manualForm.screeningAnswers.length === 1 && !item.question.trim() && !item.answer.trim()}>Remove</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={resetManualForm} disabled={creating}>Clear form</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'Saving...' : 'Add prospect'}</Button>
                </div>
              </form>
            )}
          </SectionCard>
        </div>

        <SectionCard eyebrow="Import" title="Excel import" description="Upload a prospect spreadsheet and tag the imported candidates with the correct prospect type.">
          {typesLoading ? (
            <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">Loading import-enabled prospect types...</div>
          ) : importableProspectTypes.length === 0 ? (
            <div className="space-y-4">
              <NoticeBanner tone="warning" message="No prospect types are currently mapped to an Excel import template." />
              <Link href="/settings/prospect-types" className={secondaryButtonClasses}>Configure prospect types</Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <Field label="Prospect type" htmlFor="uploadType" required>
                <select id="uploadType" value={uploadProspectType} onChange={(event) => setUploadProspectType(event.target.value)} className={selectClasses}>
                  {importableProspectTypes.map((item) => <option key={item.Id} value={item.Name}>{item.Name}</option>)}
                </select>
              </Field>
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading...' : 'Choose Excel file'}</Button>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Visible prospects" value={data.length} helper="Rows in the current result set" />
        <MetricCard label="Selected" value={selectedIds.size} helper="Candidates selected for bulk action" tone="warning" />
        <MetricCard label="In onboarding" value={onboardingCount} helper="Prospects already converted to employees" tone="success" />
      </div>

      <SectionCard
        eyebrow="Directory"
        title="Prospect list"
        description="Filter candidates, open the checklist, and send qualified prospects into onboarding."
        actions={<div className="flex flex-wrap items-center gap-3">
          <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} className={selectClasses}>
            <option value="">All types</option>
            {prospectTypes.map((item) => <option key={item.Id} value={item.Name}>{item.Name}</option>)}
          </select>
          <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className={selectClasses}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} per page</option>)}
          </select>
          {selectedIds.size > 0 ? <Button type="button" variant="destructive" onClick={() => void handleDeleteSelected()}>Delete selected ({selectedIds.size})</Button> : null}
        </div>}
      >
        {loading ? (
          <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">Loading prospects...</div>
        ) : data.length === 0 ? (
          <EmptyState title="No prospects available" description="Add a prospect manually or import an Excel file to populate the pipeline." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className={tableHeaderRowClasses}>
                    <th className="pb-3 pr-4"><input type="checkbox" checked={data.length > 0 && selectedIds.size === data.length} onChange={toggleSelectAll} className="h-4 w-4 rounded border-[var(--surface-border)] text-[var(--primary)] focus:ring-[var(--primary)]" /></th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Phone</th>
                    <th className="pb-3 pr-4">Interview</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((prospect) => (
                    <tr key={prospect.Id} className={tableBodyRowClasses}>
                      <td className="py-4 pr-4"><input type="checkbox" checked={selectedIds.has(prospect.Id)} onChange={() => toggleSelect(prospect.Id)} className="h-4 w-4 rounded border-[var(--surface-border)] text-[var(--primary)] focus:ring-[var(--primary)]" /></td>
                      <td className="py-4 pr-4 text-[var(--muted)]">{prospect.ProspectType || 'Unassigned'}</td>
                      <td className="py-4 pr-4"><p className="font-medium text-[var(--foreground)]">{displayName(prospect)}</p><p className="mt-1 text-xs text-[var(--muted)]">{prospect.CityArea || 'Location not recorded'}</p></td>
                      <td className="py-4 pr-4 text-[var(--muted)]">{prospect.Phone || 'No phone'}</td>
                      <td className="py-4 pr-4 text-[var(--muted)]">{prospect.InterviewDate ? `${String(prospect.InterviewDate).slice(0, 10)}${prospect.InterviewTime ? ` ${prospect.InterviewTime}` : ''}` : 'Not scheduled'}</td>
                      <td className="py-4 pr-4"><StatusBadge label={getStatusLabel(prospect)} tone={getStatusTone(prospect)} /></td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-4">
                          <Link href={`/prospects/checklist/${prospect.Id}`} className={inlineActionClasses}>Checklist</Link>
                          {prospect.ConvertedToEmployeeId ? <Link href={`/onboarding?employeeId=${prospect.ConvertedToEmployeeId}`} className={inlineActionClasses}>Onboarding</Link> : null}
                          <button type="button" onClick={() => void handleDeleteOne(prospect.Id)} disabled={deletingIds.has(prospect.Id)} className="text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50">{deletingIds.has(prospect.Id) ? 'Deleting...' : 'Delete'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-[var(--surface-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--muted)]">Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}</p>
              <div className="flex items-center gap-3">
                <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Previous</Button>
                <span className="text-sm text-[var(--muted)]">Page {page} of {totalPages}</span>
                <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
