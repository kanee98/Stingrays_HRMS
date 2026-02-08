'use client';

import Link from 'next/link';

export default function PayrollHomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboard</h2>
      <p className="text-gray-600 mb-6">
        Create pay runs by month/year, generate payslips by the 2nd of each month, and manage tax brackets and deduction rules.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/payruns"
          className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-indigo-500 hover:shadow"
        >
          <h3 className="font-medium text-gray-900">Pay runs</h3>
          <p className="text-sm text-gray-500 mt-1">Create and manage monthly pay runs, generate payslips.</p>
        </Link>
        <Link
          href="/config"
          className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-indigo-500 hover:shadow"
        >
          <h3 className="font-medium text-gray-900">Config</h3>
          <p className="text-sm text-gray-500 mt-1">Tax brackets and deduction rules (per employee overrides).</p>
        </Link>
        <Link
          href="/reports"
          className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-indigo-500 hover:shadow"
        >
          <h3 className="font-medium text-gray-900">Reports</h3>
          <p className="text-sm text-gray-500 mt-1">Payroll summary and monthly detail.</p>
        </Link>
      </div>
    </div>
  );
}
