'use client';

import { useEffect } from 'react';
import { AppLayout } from '@shared/components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { payrollSidebarItems } from '../config/sidebarItems';

const HRMS_URL = process.env.NEXT_PUBLIC_HRMS_URL || 'http://localhost:3000';
const PAYROLL_URL = process.env.NEXT_PUBLIC_PAYROLL_URL || 'http://localhost:3010';

/**
 * Payroll microservice layout: uniform AppLayout from hrms-ui shared.
 * Only sidebar items and body (children) change; topbar and footer are constant.
 * SSO: requires auth; redirects to HRMS login when not authenticated.
 */
export function PayrollLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  const onLogout = () => {
    // Clear storage and redirect immediately — do NOT call logout() or setState so nothing re-renders before navigate
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    document.cookie = 'auth_token=; path=/; max-age=0';
    window.location.replace(`${window.location.origin}/?logout=1`);
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      window.location.href = `${HRMS_URL}/login?returnUrl=${encodeURIComponent(PAYROLL_URL)}`;
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-indigo-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout
      sidebarItems={payrollSidebarItems}
      variant="payroll"
      user={{ email: user.email, role: user.role }}
      onLogout={onLogout}
    >
      {children}
    </AppLayout>
  );
}
