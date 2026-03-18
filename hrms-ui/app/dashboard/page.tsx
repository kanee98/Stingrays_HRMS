'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getEmployeeUrl, getPayrollUrl } from '@shared/lib/appUrls';
import { ActionCard } from '@shared/components/ActionCard';
import { MetricCard } from '@shared/components/MetricCard';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { primaryButtonClasses, secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';

function Icon({ path }: { path: string }) {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    </svg>
  );
}

interface DashboardUser {
  Id: number;
  IsActive: boolean;
}

function DashboardContent() {
  const { user } = useAuth();
  const payrollUrl = getPayrollUrl();
  const [activeUserCount, setActiveUserCount] = useState<number | null>(null);
  const [totalUserCount, setTotalUserCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUserAccessSummary() {
      try {
        const response = await fetch('/api/users', {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load user access summary');
        }

        const data = await response.json();
        const users = Array.isArray(data) ? data as DashboardUser[] : [];
        setTotalUserCount(users.length);
        setActiveUserCount(users.filter((account) => account.IsActive).length);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('Failed to load dashboard user access summary:', error);
        setTotalUserCount(null);
        setActiveUserCount(null);
      }
    }

    void loadUserAccessSummary();

    return () => {
      controller.abort();
    };
  }, []);

  const userAccessHelper = totalUserCount == null
    ? 'Current access coverage is unavailable right now'
    : `${totalUserCount} total HRMS account${totalUserCount === 1 ? '' : 's'} with platform access`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Core Operations"
        title="HRMS dashboard"
        description="Operate workforce records, policies, and day-to-day HR workflows using the same shared page system as onboarding and payroll."
        meta={<span>Welcome back, {user?.email}</span>}
        actions={
          <>
            <a href={getEmployeeUrl()} className={secondaryButtonClasses}>Open onboarding</a>
            <Link href="/reports" className={primaryButtonClasses}>Open reports</Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Employees" value="0" helper="Current people records in HRMS" tone="primary" icon={<Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0" />} />
        <MetricCard label="Active contracts" value="0" helper="Employees currently in service" tone="success" icon={<Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />} />
        <MetricCard label="Pending tasks" value="0" helper="Outstanding HR operations to review" tone="warning" icon={<Icon path="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v-1m0-8c1.11 0 2.08.402 2.599 1M9.401 15c.519.598 1.49 1 2.599 1" />} />
        <MetricCard label="Active user access" value={activeUserCount ?? '...'} helper={userAccessHelper} tone="info" icon={<Icon path="M17 20h5v-1a4 4 0 00-5-3.874M17 20H7m10 0v-1c0-.73-.195-1.414-.536-2.004M7 20H2v-1a4 4 0 015-3.874M7 20v-1c0-.73.195-1.414.536-2.004m0 0a5 5 0 018.928 0M15 7a3 3 0 11-6 0 3 3 0 016 0" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
        <SectionCard eyebrow="Quick Actions" title="Move work forward" description="Jump into the most common HRMS tasks without leaving the shared module shell.">
          <div className="grid gap-3 md:grid-cols-2">
            <ActionCard title="Manage employees" description="Review workforce records and user access." href="/users" />
            <ActionCard title="Review attendance" description="Track daily presence and operational exceptions." href="/attendance" />
            <ActionCard title="Approve leave" description="Work through pending requests and balances." href="/leave" />
            <ActionCard title="Open settings" description="Maintain operational defaults and system behavior." href="/settings" />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Operational Priorities" title="Keep the HR cycle moving" description="Focus on the workstreams that unblock payroll, employee experience, and reporting across the platform.">
          <div className="grid gap-3">
            <ActionCard title="Prepare attendance for payroll cutoff" description="Clear attendance exceptions and leave balances before the next payroll cycle is processed." href="/attendance" actionLabel="Review" />
            <ActionCard title="Move approved hires into onboarding" description="Hand off candidates into the onboarding workspace so document collection and readiness can start." href={getEmployeeUrl()} external actionLabel="Open" />
            <ActionCard title="Validate pay-impacting changes" description="Once contracts, attendance, and leave are up to date, continue into payroll to run the period." href={payrollUrl} external actionLabel="Open" />
            <ActionCard title="Review downstream reporting" description="Use HRMS reports to verify workforce trends, operational issues, and follow-up actions." href="/reports" actionLabel="Review" />
          </div>
        </SectionCard>
      </div>
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
