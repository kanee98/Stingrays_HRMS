'use client';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProspectsClient } from './ProspectsClient';

export default function ProspectsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ProspectsClient />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
