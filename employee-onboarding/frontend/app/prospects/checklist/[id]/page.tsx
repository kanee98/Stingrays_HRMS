'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@shared/components/Button';
import { Field } from '@shared/components/Field';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { StatusBadge } from '@shared/components/StatusBadge';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { inputClasses, selectClasses, secondaryButtonClasses, textareaClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { DashboardLayout } from '../../../components/DashboardLayout';

const API_URL = getEmployeeApiUrl();

const INTERVIEW_STATUSES = [
  { value: '', label: 'None' },
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No show' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

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
  ScreeningAnswers: string | null;
  InterviewDate: string | null;
  InterviewTime: string | null;
  InterviewStatus: string | null;
  Notes: string | null;
  SlotConfirmed: string | null;
  ZoomLink: string | null;
  VideoSwimCert: string | null;
  OverallInterviewVerdict: string | null;
  OfferStatus: string | null;
  JoiningCommitment: string | null;
  ExpectedStartDate: string | null;
  ProspectType: string | null;
  ConvertedToEmployeeId: number | null;
}

export default function ProspectChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    slotConfirmed: '',
    interviewDate: '',
    interviewTime: '',
    interviewStatus: '',
    zoomLink: '',
    videoSwimCert: '',
    overallInterviewVerdict: '',
    offerStatus: '',
    joiningCommitment: '',
    expectedStartDate: '',
    notes: '',
  });

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setLoading(false);
      setError('Invalid prospect ID.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/prospects/${id}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setProspect(data);
        setForm({
          slotConfirmed: data.SlotConfirmed ?? '',
          interviewDate: data.InterviewDate ? String(data.InterviewDate).slice(0, 10) : '',
          interviewTime: data.InterviewTime ?? '',
          interviewStatus: data.InterviewStatus ?? '',
          zoomLink: data.ZoomLink ?? '',
          videoSwimCert: data.VideoSwimCert ?? '',
          overallInterviewVerdict: data.OverallInterviewVerdict ?? '',
          offerStatus: data.OfferStatus ?? '',
          joiningCommitment: data.JoiningCommitment ?? '',
          expectedStartDate: data.ExpectedStartDate ? String(data.ExpectedStartDate).slice(0, 10) : '',
          notes: data.Notes ?? '',
        });
      } catch {
        if (!cancelled) setError('Failed to load prospect');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotConfirmed: form.slotConfirmed || null,
          interviewDate: form.interviewDate || null,
          interviewTime: form.interviewTime || null,
          interviewStatus: form.interviewStatus || null,
          zoomLink: form.zoomLink || null,
          videoSwimCert: form.videoSwimCert || null,
          overallInterviewVerdict: form.overallInterviewVerdict || null,
          offerStatus: form.offerStatus || null,
          joiningCommitment: form.joiningCommitment || null,
          expectedStartDate: form.expectedStartDate || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      const updated = await res.json();
      setProspect(updated);
      setMessage('Prospect checklist updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToOnboarding = async () => {
    if (!id) return;
    if (!window.confirm('Create employee from this prospect and start onboarding?')) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/prospects/${id}/to-employee`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to start onboarding');
      router.push(`/onboarding?employeeId=${data.employeeId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start onboarding');
      setSending(false);
    }
  };

  const screening = (() => {
    if (!prospect?.ScreeningAnswers) return [] as { question: string; answer: string }[];
    try {
      const arr = JSON.parse(prospect.ScreeningAnswers);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  })();

  const displayName = prospect?.FullName?.trim() || [prospect?.FirstName, prospect?.LastName].filter(Boolean).join(' ') || 'Unnamed prospect';

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            eyebrow="Prospect Review"
            title="Prospect checklist"
            description="Review screening answers, capture interview outcomes, and promote qualified candidates into onboarding from one shared management page."
            actions={<Link href="/prospects" className={secondaryButtonClasses}>Back to prospects</Link>}
            meta={prospect?.ProspectType ? <StatusBadge label={prospect.ProspectType} tone="info" /> : undefined}
          />

          {loading ? <NoticeBanner tone="info" message="Loading prospect details..." /> : null}
          {error ? <NoticeBanner tone="error" message={error} /> : null}
          {message ? <NoticeBanner tone="success" message={message} /> : null}

          {prospect ? (
            <>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
                <SectionCard eyebrow="Candidate" title={displayName} description="Imported prospect profile details carried into the recruitment and onboarding flow.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Email</p><p className="mt-1 text-sm text-[var(--foreground)]">{prospect.Email || 'Not provided'}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Phone</p><p className="mt-1 text-sm text-[var(--foreground)]">{prospect.Phone || 'Not provided'}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">City / area</p><p className="mt-1 text-sm text-[var(--foreground)]">{prospect.CityArea || 'Not provided'}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Gender</p><p className="mt-1 text-sm text-[var(--foreground)]">{prospect.Gender || 'Not provided'}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Date of birth</p><p className="mt-1 text-sm text-[var(--foreground)]">{prospect.DateOfBirth ? String(prospect.DateOfBirth).slice(0, 10) : 'Not provided'}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Status</p><p className="mt-1 text-sm text-[var(--foreground)]">{prospect.ConvertedToEmployeeId ? 'Sent to onboarding' : prospect.InterviewStatus || 'Awaiting interview'}</p></div>
                  </div>
                </SectionCard>

                <SectionCard eyebrow="Screening" title="Imported screening answers" description="Responses imported from the original Excel or screening source.">
                  {screening.length === 0 ? (
                    <NoticeBanner tone="info" message="No screening answers were recorded for this prospect." />
                  ) : (
                    <div className="space-y-3">
                      {screening.map((item, index) => (
                        <div key={`${item.question}-${index}`} className="rounded-[20px] bg-[var(--surface-muted)] px-4 py-4">
                          <p className="text-sm font-semibold text-[var(--foreground)]">{item.question?.trim() || `Question ${index + 1}`}</p>
                          <p className="mt-2 text-sm text-[var(--muted)]">{item.answer?.trim() || 'No answer recorded'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              <SectionCard eyebrow="Interview and Offer" title="Checklist updates" description="Capture scheduling, interview outcomes, offer status, and notes before moving the candidate into onboarding.">
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field label="Slot confirmed" htmlFor="slotConfirmed">
                      <select id="slotConfirmed" value={form.slotConfirmed} onChange={(e) => setForm((current) => ({ ...current, slotConfirmed: e.target.value }))} className={selectClasses}>
                        <option value="">Not set</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </Field>
                    <Field label="Interview status" htmlFor="interviewStatus">
                      <select id="interviewStatus" value={form.interviewStatus} onChange={(e) => setForm((current) => ({ ...current, interviewStatus: e.target.value }))} className={selectClasses}>
                        {INTERVIEW_STATUSES.map((option) => (
                          <option key={option.value || 'none'} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Interview date" htmlFor="interviewDate">
                      <input id="interviewDate" type="date" value={form.interviewDate} onChange={(e) => setForm((current) => ({ ...current, interviewDate: e.target.value }))} className={inputClasses} />
                    </Field>
                    <Field label="Interview time" htmlFor="interviewTime">
                      <input id="interviewTime" type="time" value={form.interviewTime} onChange={(e) => setForm((current) => ({ ...current, interviewTime: e.target.value }))} className={inputClasses} />
                    </Field>
                    <Field label="Zoom link" htmlFor="zoomLink">
                      <input id="zoomLink" type="text" value={form.zoomLink} onChange={(e) => setForm((current) => ({ ...current, zoomLink: e.target.value }))} className={inputClasses} />
                    </Field>
                    <Field label="Video / swim certificate" htmlFor="videoSwimCert">
                      <input id="videoSwimCert" type="text" value={form.videoSwimCert} onChange={(e) => setForm((current) => ({ ...current, videoSwimCert: e.target.value }))} className={inputClasses} />
                    </Field>
                    <Field label="Interview verdict" htmlFor="overallInterviewVerdict">
                      <input id="overallInterviewVerdict" type="text" value={form.overallInterviewVerdict} onChange={(e) => setForm((current) => ({ ...current, overallInterviewVerdict: e.target.value }))} className={inputClasses} />
                    </Field>
                    <Field label="Offer status" htmlFor="offerStatus">
                      <input id="offerStatus" type="text" value={form.offerStatus} onChange={(e) => setForm((current) => ({ ...current, offerStatus: e.target.value }))} className={inputClasses} />
                    </Field>
                    <Field label="Joining commitment" htmlFor="joiningCommitment">
                      <input id="joiningCommitment" type="text" value={form.joiningCommitment} onChange={(e) => setForm((current) => ({ ...current, joiningCommitment: e.target.value }))} className={inputClasses} />
                    </Field>
                    <Field label="Expected start date" htmlFor="expectedStartDate">
                      <input id="expectedStartDate" type="date" value={form.expectedStartDate} onChange={(e) => setForm((current) => ({ ...current, expectedStartDate: e.target.value }))} className={inputClasses} />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Notes" htmlFor="notes">
                        <textarea id="notes" rows={4} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} className={textareaClasses} />
                      </Field>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save checklist'}</Button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard eyebrow="Onboarding Handoff" title="Promote to employee" description="Create the employee record from this prospect and continue the onboarding workflow in the next module step.">
                {prospect.ConvertedToEmployeeId ? (
                  <Link href={`/onboarding?employeeId=${prospect.ConvertedToEmployeeId}`} className={secondaryButtonClasses}>
                    Continue onboarding
                  </Link>
                ) : (
                  <Button type="button" onClick={() => void handleSendToOnboarding()} disabled={sending}>
                    {sending ? 'Creating employee...' : 'Send to onboarding'}
                  </Button>
                )}
              </SectionCard>
            </>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
