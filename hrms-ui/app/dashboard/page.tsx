'use client';

import { getEmployeeUrl } from '@shared/lib/appUrls';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '@shared/components/Card';

function DashboardContent() {
  const { user } = useAuth();

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Dashboard</h2>
        <p className="mt-2 text-[var(--muted)]">Welcome back, {user?.email}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card padding="md">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-3">
              <svg
                className="w-6 h-6 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[var(--muted)]">Total Employees</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">0</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[var(--muted)]">Active Contracts</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">0</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[var(--muted)]">Pending Tasks</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">0</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card padding="md" className="mb-8">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href={getEmployeeUrl()}
            className="flex items-center p-4 border border-[var(--surface-border)] rounded-lg hover:border-[var(--primary)] hover:bg-[var(--primary-muted)] transition"
          >
            <svg
              className="w-5 h-5 text-indigo-600 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-[var(--foreground)] font-medium">Add New Employee</span>
          </a>
          <a
            href="/reports"
            className="flex items-center p-4 border border-[var(--surface-border)] rounded-lg hover:border-[var(--primary)] hover:bg-[var(--primary-muted)] transition"
          >
            <svg
              className="w-5 h-5 text-indigo-600 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-[var(--foreground)] font-medium">Generate Report</span>
          </a>
        </div>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
