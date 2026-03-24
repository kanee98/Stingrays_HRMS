'use client';

import Link from 'next/link';
import { FeaturePlaceholderPage } from '@shared/components/FeaturePlaceholderPage';
import { secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeaturePlaceholderPage
          eyebrow="Configuration"
          title="Settings"
          description="Company-level configuration and policy controls will be introduced here using the same design primitives as the rest of the platform."
          emptyTitle="Settings workflow is planned"
          emptyDescription="System preferences, company settings, and policy defaults will be exposed here once implemented."
          relatedActions={[
            {
              title: 'Manage platform users',
              description: 'Use the existing user administration flow while deeper settings are being connected.',
              action: <Link href="/users" className={secondaryButtonClasses}>Open users</Link>,
            },
            {
              title: 'Review dashboard priorities',
              description: 'Use the main dashboard to move work across attendance, onboarding, and payroll.',
              action: <Link href="/dashboard" className={secondaryButtonClasses}>Open dashboard</Link>,
            },
          ]}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
