'use client';

import Link from 'next/link';
import { FeaturePlaceholderPage } from '@shared/components/FeaturePlaceholderPage';
import { secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function ChecklistsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeaturePlaceholderPage
          eyebrow="Readiness Standards"
          title="Checklists"
          description="Role and department checklists will be managed here using the same shared module layout and interaction patterns."
          emptyTitle="Checklist management is planned"
          emptyDescription="Standard onboarding task packs for HR, IT, and managers will live here once the checklist workflow is implemented."
          relatedActions={[
            {
              title: 'Open prospects',
              description: 'Continue candidate review and interview follow-up while checklist templates are being delivered.',
              action: <Link href="/prospects" className={secondaryButtonClasses}>Open prospects</Link>,
            },
            {
              title: 'Open document types',
              description: 'Maintain onboarding document requirements in the meantime.',
              action: <Link href="/settings/document-types" className={secondaryButtonClasses}>Open settings</Link>,
            },
          ]}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
