'use client';

import Link from 'next/link';
import { FeaturePlaceholderPage } from '@shared/components/FeaturePlaceholderPage';
import { secondaryButtonClasses } from '@shared/lib/ui';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function RecruitmentPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeaturePlaceholderPage
          eyebrow="Hiring Pipeline"
          title="Recruitment"
          description="Job postings and interview pipeline views will be added here while preserving the same interaction model used across the platform."
          emptyTitle="Recruitment workflow is planned"
          emptyDescription="Hiring stages, applications, and offer coordination will appear here in the shared module format."
          relatedActions={[
            {
              title: 'Open onboarding prospects',
              description: 'Continue candidate review and checklist work in the onboarding module.',
              action: <a href="/" className={secondaryButtonClasses}>Back to dashboard</a>,
            },
            {
              title: 'Review employee records',
              description: 'Keep people data accurate while the dedicated hiring workflow is being built.',
              action: <Link href="/users" className={secondaryButtonClasses}>Open users</Link>,
            },
          ]}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
