'use client';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../components/DashboardLayout';

export default function PayrollPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payroll</h2>
          <p className="text-gray-600 mb-6">Salary processing, payslips, and tax compliance.</p>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 font-medium">Payroll module coming soon</p>
            <p className="text-sm text-gray-400 mt-1">Process salaries, generate payslips, and manage deductions.</p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
