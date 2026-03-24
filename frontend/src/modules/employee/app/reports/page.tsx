'use client';

import Link from 'next/link';
import { FeaturePlaceholderPage } from '@shared/components/FeaturePlaceholderPage';
import { secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';
import { employeePath } from '../lib/routes';

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeaturePlaceholderPage
          eyebrow="Onboarding Analytics"
          title="Reports"
          description="Completion, readiness, and onboarding throughput reporting will be added here within the same shared experience used across all modules."
          emptyTitle="Onboarding reporting is planned"
          emptyDescription="Completion rates, time-to-ready, and compliance reporting will appear here once the reporting pipeline is connected."
          relatedActions={[
            {
              title: 'Review prospects',
              description: 'Keep the candidate funnel moving while dedicated onboarding reports are being built.',
              action: <Link href={employeePath('/prospects')} className={secondaryButtonClasses}>Open prospects</Link>,
            },
            {
              title: 'Open onboarding settings',
              description: 'Configure the workflow inputs that future reports will depend on.',
              action: <Link href={employeePath('/settings/onboarding')} className={secondaryButtonClasses}>Open settings</Link>,
            },
          ]}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
