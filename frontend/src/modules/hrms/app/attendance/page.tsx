'use client';

import Link from 'next/link';
import { FeaturePlaceholderPage } from '@shared/components/FeaturePlaceholderPage';
import { secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function AttendancePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeaturePlaceholderPage
          eyebrow="Attendance Operations"
          title="Attendance"
          description="Track working time, exceptions, and cutoff readiness using the shared microservice page system."
          emptyTitle="Attendance workflow is planned"
          emptyDescription="Clocking, timesheets, and attendance exception management will land here without changing the surrounding UX contract."
          relatedActions={[
            {
              title: 'Review leave balances',
              description: 'Clear absence-related decisions before payroll cutoff.',
              action: <Link href="/leave" className={secondaryButtonClasses}>Open leave</Link>,
            },
            {
              title: 'Manage people records',
              description: 'Keep active employees and roles current while attendance features are being completed.',
              action: <Link href="/users" className={secondaryButtonClasses}>Open users</Link>,
            },
          ]}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
