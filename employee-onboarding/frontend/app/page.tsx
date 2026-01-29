'use client';

import { ProtectedRoute } from './components/ProtectedRoute';
import { OnboardingForm } from './components/OnboardingForm';

export default function EmployeePage() {
  return (
    <ProtectedRoute>
      <OnboardingForm />
    </ProtectedRoute>
  );
}