'use client';

import { getPayrollUrl } from '@shared/lib/appUrls';
import { FeaturePlaceholderPage } from '@shared/components/FeaturePlaceholderPage';
import { secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function PayrollPage() {
  const payrollUrl = getPayrollUrl();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeaturePlaceholderPage
          eyebrow="Compensation Bridge"
          title="Payroll"
          description="Payroll now runs in its dedicated module while this route remains aligned to the same shared UX contract."
          emptyTitle="Payroll processing lives in the Payroll module"
          emptyDescription="Use the dedicated payroll microservice for pay runs, reports, and configuration. This bridge page stays consistent with the rest of HRMS."
          actions={<a href={payrollUrl} className={secondaryButtonClasses}>Open payroll module</a>}
          relatedActions={[
            {
              title: 'Prepare attendance for payroll',
              description: 'Clear operational inputs before moving into the payroll cycle.',
              action: <a href="/attendance" className={secondaryButtonClasses}>Open attendance</a>,
            },
            {
              title: 'Review employee changes',
              description: 'Keep contracts and people data accurate before payroll processing.',
              action: <a href="/users" className={secondaryButtonClasses}>Open users</a>,
            },
          ]}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
