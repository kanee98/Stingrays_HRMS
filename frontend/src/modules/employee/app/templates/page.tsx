'use client';

import Link from 'next/link';
import { FeaturePlaceholderPage } from '@shared/components/FeaturePlaceholderPage';
import { secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';
import { employeePath } from '../lib/routes';

export default function TemplatesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeaturePlaceholderPage
          eyebrow="Document Management"
          title="Templates"
          description="Offer letters, acknowledgements, and reusable onboarding documents will be managed here using the shared microservice page system."
          emptyTitle="Template management is planned"
          emptyDescription="Reusable contract, policy, and onboarding document templates will be introduced here without breaking the shared UX pattern."
          relatedActions={[
            {
              title: 'Open onboarding flow',
              description: 'Continue current onboarding work while template management is being completed.',
              action: <Link href={employeePath('/onboarding')} className={secondaryButtonClasses}>Open onboarding</Link>,
            },
            {
              title: 'Open document types',
              description: 'Maintain required upload categories while reusable templates are still pending.',
              action: <Link href={employeePath('/settings/document-types')} className={secondaryButtonClasses}>Open settings</Link>,
            },
          ]}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
