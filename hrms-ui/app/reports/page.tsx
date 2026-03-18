'use client';

import Link from 'next/link';
import { FeaturePlaceholderPage } from '@shared/components/FeaturePlaceholderPage';
import { secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeaturePlaceholderPage
          eyebrow="Reporting"
          title="Reports"
          description="Analytics, exports, and operational reporting will be delivered here on top of the shared page architecture."
          emptyTitle="Reporting workflow is planned"
          emptyDescription="Headcount, turnover, compliance, and custom reporting will use this shared structure once connected."
          relatedActions={[
            {
              title: 'Review users',
              description: 'Keep your workforce and access records current while full reporting is under development.',
              action: <Link href="/users" className={secondaryButtonClasses}>Open users</Link>,
            },
            {
              title: 'Open settings',
              description: 'Maintain the operational defaults that future reports will depend on.',
              action: <Link href="/settings" className={secondaryButtonClasses}>Open settings</Link>,
            },
          ]}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
