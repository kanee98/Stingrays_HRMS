'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { DashboardLayout } from '../../../components/DashboardLayout';
import Link from 'next/link';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_EMPLOYEE_API_URL ||
  "/api-proxy";

const INTERVIEW_STATUSES = [
  { value: '', label: '—' },
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
  Source: string;
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
  CreatedAt: string;
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
      setError('Invalid prospect id');
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
    return () => { cancelled = true; };
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');
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
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      const updated = await res.json();
      setProspect(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToOnboarding = async () => {
    if (!id) return;
    if (!confirm('Create employee from this prospect and start onboarding?')) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/prospects/${id}/to-employee`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.push(`/onboarding?employeeId=${data.employeeId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start onboarding');
      setSending(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6 lg:p-8">
            <p className="text-gray-500">Loading prospect…</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error && !prospect) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6 lg:p-8">
            <p className="text-red-600">{error}</p>
            <Link href="/prospects" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
              ← Back to Prospects
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const screening = ((): { question: string; answer: string }[] => {
    if (!prospect?.ScreeningAnswers) return [];
    try {
      const arr = JSON.parse(prospect.ScreeningAnswers);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  })();

  const displayName =
    prospect?.FullName?.trim() ||
    [prospect?.FirstName, prospect?.LastName].filter(Boolean).join(' ') ||
    '—';

  const field = (label: string, id: string, type: 'text' | 'date' | 'time' | 'textarea', value: string, onChange: (v: string) => void) => (
    <div key={id}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      )}
    </div>
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-4xl">
          <div className="mb-6">
            <Link href="/prospects" className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 inline-block">
              ← Back to Prospects
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">Prospect Checklist</h2>
            <p className="text-gray-600 mt-1">Review screening answers and capture interview & offer details</p>
            {prospect?.ProspectType && (
              <p className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {prospect.ProspectType}
                </span>
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Screening Q&A (from Excel) */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Screening answers</h3>
            {screening.length === 0 ? (
              <p className="text-gray-500 text-sm">No screening answers recorded.</p>
            ) : (
              <ul className="space-y-4">
                {screening.map((item, i) => {
                  const label = item.question?.trim() || `Screening question ${i + 1}`;
                  const answer = item.answer?.trim() || '—';
                  return (
                    <li key={i} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                      <p className="text-sm font-medium text-gray-800 mb-1">{label}</p>
                      <p className="text-sm text-gray-700">{answer}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Contact & profile (from Excel) */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact & profile</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Full name</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{displayName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">City / Area</dt>
                <dd className="mt-1 text-sm text-gray-900">{prospect?.CityArea || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{prospect?.Phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Gender</dt>
                <dd className="mt-1 text-sm text-gray-900">{prospect?.Gender || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Date of birth</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {prospect?.DateOfBirth ? String(prospect.DateOfBirth).slice(0, 10) : '—'}
                </dd>
              </div>
              {prospect?.Email && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{prospect.Email}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* System-captured: Slot Confirmed, Interview, Zoom, Verdict, Offer, Joining, Expected Start, Notes */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview & offer (captured in system)</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="slotConfirmed" className="block text-sm font-medium text-gray-700 mb-1">Slot Confirmed</label>
                  <select
                    id="slotConfirmed"
                    value={form.slotConfirmed}
                    onChange={(e) => setForm((f) => ({ ...f, slotConfirmed: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                {field('Interview Date', 'interviewDate', 'date', form.interviewDate, (v) => setForm((f) => ({ ...f, interviewDate: v })))}
                {field('Interview Time', 'interviewTime', 'time', form.interviewTime, (v) => setForm((f) => ({ ...f, interviewTime: v })))}
              </div>
              <div>
                <label htmlFor="interviewStatus" className="block text-sm font-medium text-gray-700 mb-1">Interview Status</label>
                <select
                  id="interviewStatus"
                  value={form.interviewStatus}
                  onChange={(e) => setForm((f) => ({ ...f, interviewStatus: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {INTERVIEW_STATUSES.map((opt) => (
                    <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {field('Zoom Link', 'zoomLink', 'text', form.zoomLink, (v) => setForm((f) => ({ ...f, zoomLink: v })))}
              {field('Video / Swim Cert', 'videoSwimCert', 'text', form.videoSwimCert, (v) => setForm((f) => ({ ...f, videoSwimCert: v })))}
              {field('Overall Interview Verdict', 'overallInterviewVerdict', 'text', form.overallInterviewVerdict, (v) => setForm((f) => ({ ...f, overallInterviewVerdict: v })))}
              {field('Offer Status', 'offerStatus', 'text', form.offerStatus, (v) => setForm((f) => ({ ...f, offerStatus: v })))}
              {field('Joining Commitment', 'joiningCommitment', 'text', form.joiningCommitment, (v) => setForm((f) => ({ ...f, joiningCommitment: v })))}
              {field('Expected Start Date', 'expectedStartDate', 'date', form.expectedStartDate, (v) => setForm((f) => ({ ...f, expectedStartDate: v })))}
              {field('Notes', 'notes', 'textarea', form.notes, (v) => setForm((f) => ({ ...f, notes: v })))}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>

          {/* Onboarding */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Onboarding</h3>
            <p className="text-sm text-gray-500 mb-4">
              Create an employee record from this prospect and open the onboarding flow.
            </p>
            {prospect?.ConvertedToEmployeeId ? (
              <Link
                href={`/onboarding?employeeId=${prospect.ConvertedToEmployeeId}`}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
              >
                Continue onboarding →
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleSendToOnboarding}
                disabled={sending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
              >
                {sending ? 'Creating…' : 'Send to onboarding'}
              </button>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
