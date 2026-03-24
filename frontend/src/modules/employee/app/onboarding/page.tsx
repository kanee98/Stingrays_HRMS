'use client';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';
import { PageHeader } from '@shared/components/PageHeader';
import { OnboardingForm } from '../components/OnboardingForm';

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            eyebrow="Employee Onboarding"
            title="New onboarding flow"
            description="Capture employee information, collect required documents, and complete contract generation inside the shared platform workflow."
          />
          <OnboardingForm />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
