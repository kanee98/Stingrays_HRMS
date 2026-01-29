'use client';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function LeavePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Leave Management</h2>
          <p className="text-gray-600 mb-6">Leave requests, balances, and approvals.</p>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 font-medium">Leave management coming soon</p>
            <p className="text-sm text-gray-400 mt-1">Apply for leave, track balances, and approve requests.</p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
