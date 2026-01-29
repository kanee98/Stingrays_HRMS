'use client';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reports</h2>
          <p className="text-gray-600 mb-6">Analytics, exports, and custom reports.</p>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 font-medium">Reports module coming soon</p>
            <p className="text-sm text-gray-400 mt-1">Generate headcount, turnover, and custom reports.</p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
