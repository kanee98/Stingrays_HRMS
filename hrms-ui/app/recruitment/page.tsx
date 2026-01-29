'use client';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function RecruitmentPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Recruitment</h2>
          <p className="text-gray-600 mb-6">Job postings, applications, and hiring pipeline.</p>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 font-medium">Recruitment module coming soon</p>
            <p className="text-sm text-gray-400 mt-1">Post jobs, manage candidates, and track hiring.</p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
