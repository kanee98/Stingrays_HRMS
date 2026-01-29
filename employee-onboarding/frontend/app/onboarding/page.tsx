'use client';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';
import { OnboardingForm } from '../components/OnboardingForm';

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">New Employee Onboarding</h2>
          <OnboardingForm />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
