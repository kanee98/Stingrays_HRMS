'use client';

import Link from 'next/link';
import { FeaturePlaceholderPage } from '@shared/components/FeaturePlaceholderPage';
import { secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function LeavePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeaturePlaceholderPage
          eyebrow="Leave Operations"
          title="Leave management"
          description="Approvals, balances, and leave policy workflows will live here within the same shared module framework."
          emptyTitle="Leave workflow is planned"
          emptyDescription="This page is reserved for the final leave experience, including requests, balances, and approval queues."
          relatedActions={[
            {
              title: 'Review attendance impact',
              description: 'Use attendance once active to reconcile absences and payroll cutoffs.',
              action: <Link href="/attendance" className={secondaryButtonClasses}>Open attendance</Link>,
            },
            {
              title: 'Run HR reports',
              description: 'Monitor workforce activity while leave capabilities are being delivered.',
              action: <Link href="/reports" className={secondaryButtonClasses}>Open reports</Link>,
            },
          ]}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
