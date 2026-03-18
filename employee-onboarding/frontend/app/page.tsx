'use client';

import Link from 'next/link';
import { getHrmsAppUrl } from '@shared/services/platformUrls';
import { ActionCard } from '@shared/components/ActionCard';
import { MetricCard } from '@shared/components/MetricCard';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { primaryButtonClasses, secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { useAuth } from './contexts/AuthContext';

function Icon({ path }: { path: string }) {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    </svg>
  );
}

function DashboardHome() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Talent Transition"
        title="Employee onboarding"
        description="Guide prospects through onboarding, documents, and readiness checks using the same UX framework as HRMS and payroll."
        meta={<span>Welcome back, {user?.email}</span>}
        actions={
          <>
            <a href={getHrmsAppUrl()} className={secondaryButtonClasses}>Back to HRMS</a>
            <Link href="/onboarding" className={primaryButtonClasses}>Start onboarding</Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Prospects" value="0" helper="Candidates currently tracked" tone="primary" icon={<Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />} />
        <MetricCard label="In progress" value="0" helper="Onboarding journeys still active" tone="warning" icon={<Icon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />} />
        <MetricCard label="Completed" value="0" helper="Journeys ready to transition into HRMS" tone="success" icon={<Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />} />
        <MetricCard label="Pending docs" value="0" helper="Outstanding document collection work" tone="info" icon={<Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
        <SectionCard eyebrow="Quick Actions" title="Move candidates through onboarding" description="Use the same shared action-card pattern as the other modules to keep navigation predictable.">
          <div className="grid gap-3 md:grid-cols-2">
            <ActionCard title="Start employee onboarding" description="Launch a new onboarding workflow for an incoming hire." href="/onboarding" />
            <ActionCard title="Review prospects" description="Track active candidates and checklist completion." href="/prospects" />
            <ActionCard title="Manage templates" description="Maintain the documents used in onboarding workflows." href="/templates" />
            <ActionCard title="Open checklists" description="Standardize readiness and handoff tasks." href="/checklists" />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Shared UX" title="One platform language" description="Onboarding now uses the same structural page components as HRMS and payroll.">
          <div className="grid gap-3">
            <ActionCard title="Configure step visibility" description="Control optional workflow stages without leaving the shared settings layout." href="/settings/onboarding" actionLabel="Open settings" />
            <ActionCard title="Manage prospect types" description="Control the prospect catalog and Excel import mappings used by the recruitment pipeline." href="/settings/prospect-types" actionLabel="Open settings" />
            <ActionCard title="Manage departments" description="Keep onboarding department lists aligned with the employee intake flow." href="/settings/departments" actionLabel="Open settings" />
            <ActionCard title="Manage document types" description="Update required upload categories using the same settings page pattern." href="/settings/document-types" actionLabel="Open settings" />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default function EmployeeDashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DashboardHome />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
