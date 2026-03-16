'use client';

import { useState, useEffect } from 'react';
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
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/onboarding`);
        if (!res.ok) {
          setError('Failed to load settings. The server returned an error.');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setShowGramasevaka(data.showGramasevakaStep !== false);
        setShowPolice(data.showPoliceReportStep !== false);
      } catch (e) {
        if (isNetworkError(e)) {
          setError(
            API_URL.startsWith("/")
              ? "Cannot connect to the employee API. Ensure the employee-onboarding API is running (port 4000) and that both the frontend and API are running."
              : `Cannot connect to the API at ${API_URL}. Make sure the employee-onboarding API is running and NEXT_PUBLIC_API_URL is set correctly.`
          );
        } else {
          setError('Failed to load settings.');
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
      if (!res.ok) throw new Error('Failed to save');
      setMessage('Settings saved.');
    } catch (e) {
      if (isNetworkError(e)) {
        setError(
          API_URL.startsWith("/")
            ? "Cannot connect to the employee API. Ensure the employee-onboarding API is running (port 4000)."
            : `Cannot connect to the API at ${API_URL}. Make sure the employee-onboarding API is running.`
        );
      } else {
        setError('Failed to save settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Onboarding steps</h1>
          <p className="text-gray-600 text-sm mb-6">
            Choose which steps appear in the employee onboarding flow. Personal Information, Documents, and Review are always shown.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">{message}</div>
          )}

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <form onSubmit={handleSave} className="max-w-md space-y-4">
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={showGramasevaka}
                  onChange={(e) => setShowGramasevaka(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <div>
                  <span className="font-medium text-gray-900">Gramasevaka Details</span>
                  <p className="text-sm text-gray-500">Show the Gramasevaka certificate step in onboarding.</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={showPolice}
                  onChange={(e) => setShowPolice(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <div>
                  <span className="font-medium text-gray-900">Police Report</span>
                  <p className="text-sm text-gray-500">Show the Police Report step in onboarding.</p>
                </div>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </form>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
