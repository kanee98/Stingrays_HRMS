'use client';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function AttendancePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Attendance</h2>
          <p className="text-gray-600 mb-6">Clock in/out, timesheets, and attendance reports.</p>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 font-medium">Attendance module coming soon</p>
            <p className="text-sm text-gray-400 mt-1">Track check-in/check-out and view timesheets.</p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
