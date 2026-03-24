'use client';

import Link from 'next/link';
import { FeaturePlaceholderPage } from '@shared/components/FeaturePlaceholderPage';
import { secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function PerformancePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeaturePlaceholderPage
          eyebrow="Performance Cycle"
          title="Performance"
          description="Goals, reviews, and appraisal workflows will use this same page system when they are introduced."
          emptyTitle="Performance workflow is planned"
          emptyDescription="Goal setting, appraisal reviews, and performance history will be delivered here in the shared module structure."
          relatedActions={[
            {
              title: 'Open reports',
              description: 'Use reporting and dashboards to monitor workforce trends in the meantime.',
              action: <Link href="/reports" className={secondaryButtonClasses}>Open reports</Link>,
            },
            {
              title: 'Review employee data',
              description: 'Maintain the people records that future performance workflows will depend on.',
              action: <Link href="/users" className={secondaryButtonClasses}>Open users</Link>,
            },
          ]}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
