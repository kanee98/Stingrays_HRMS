'use client';

import { useState, useEffect } from 'react';
import { Button } from '@shared/components/Button';
import { Field } from '@shared/components/Field';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { checkboxClasses } from '@shared/lib/ui';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { DashboardLayout } from '../../components/DashboardLayout';

const API_URL = getEmployeeApiUrl();

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError && ((e as Error).message === 'Failed to fetch' || (e as Error).message?.includes('fetch'));
}

export default function OnboardingSettingsPage() {
  const [showGramasevaka, setShowGramasevaka] = useState(true);
  const [showPolice, setShowPolice] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/onboarding`);
        if (!res.ok) {
          setError('Failed to load onboarding settings.');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setShowGramasevaka(data.showGramasevakaStep !== false);
        setShowPolice(data.showPoliceReportStep !== false);
      } catch (e) {
        if (isNetworkError(e)) {
          setError(
            API_URL.startsWith('/')
              ? 'Cannot connect to the employee API. Ensure the employee-onboarding API is running.'
              : `Cannot connect to the API at ${API_URL}. Make sure the employee-onboarding API is running.`
          );
        } else {
          setError('Failed to load onboarding settings.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/settings/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showGramasevakaStep: showGramasevaka,
          showPoliceReportStep: showPolice,
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings.');
      setMessage('Onboarding settings saved.');
    } catch (e) {
      if (isNetworkError(e)) {
        setError(
          API_URL.startsWith('/')
            ? 'Cannot connect to the employee API. Ensure the employee-onboarding API is running.'
            : `Cannot connect to the API at ${API_URL}. Make sure the employee-onboarding API is running.`
        );
      } else {
        setError(e instanceof Error ? e.message : 'Failed to save settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            eyebrow="Workflow Settings"
            title="Onboarding steps"
            description="Control which optional steps appear in the onboarding flow while keeping the page structure aligned with the rest of the platform."
          />

          {error ? <NoticeBanner tone="error" message={error} /> : null}
          {message ? <NoticeBanner tone="success" message={message} /> : null}

          <SectionCard eyebrow="Step Visibility" title="Optional flow steps" description="Personal information, documents, and review are always enabled. Use these toggles to control the optional compliance steps.">
            {loading ? (
              <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">Loading onboarding settings...</div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <label className="flex items-start gap-3 rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-5 py-4 text-sm text-[var(--muted-strong)]">
                  <input type="checkbox" checked={showGramasevaka} onChange={(e) => setShowGramasevaka(e.target.checked)} className={checkboxClasses} />
                  <span>
                    <span className="block font-medium text-[var(--foreground)]">Gramasevaka details</span>
                    Show the Gramasevaka certificate step in the onboarding workflow.
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-5 py-4 text-sm text-[var(--muted-strong)]">
                  <input type="checkbox" checked={showPolice} onChange={(e) => setShowPolice(e.target.checked)} className={checkboxClasses} />
                  <span>
                    <span className="block font-medium text-[var(--foreground)]">Police report</span>
                    Show the police report step in the onboarding workflow.
                  </span>
                </label>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</Button>
                </div>
              </form>
            )}
          </SectionCard>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
