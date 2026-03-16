'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AppLayout } from '@shared/components/AppLayout';
import { FeatureUnavailableState } from '@shared/components/FeatureUnavailableState';
import { buildHrmsLoginUrl, getCurrentUrl } from '@shared/lib/appUrls';
import { isSectionEnabled, isServiceEnabled, useClientAccess } from '@shared/services/clientAccess';
import { useAuth } from '../contexts/AuthContext';
import { getPayrollSectionFromPath, getPayrollSidebarItems } from '../config/sidebarItems';

export function PayrollLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const { snapshot, isLoading: isAccessLoading } = useClientAccess();
  const sectionKey = getPayrollSectionFromPath(pathname);

  const onLogout = async () => {
    await logout();
    window.location.replace(buildHrmsLoginUrl());
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      window.location.replace(buildHrmsLoginUrl(getCurrentUrl()));
    }
  }, [user, isLoading]);

  if (isLoading || isAccessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-[var(--primary)] mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-sm text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isServiceEnabled(snapshot, 'payroll')) {
    return (
      <FeatureUnavailableState
        title="Payroll is disabled"
        description="Enable the payroll service for this client in Super Admin before opening payroll."
        actionHref={buildHrmsLoginUrl()}
        actionLabel="Return to Portal"
      />
    );
  }

  if (sectionKey && !isSectionEnabled(snapshot, 'payroll', sectionKey)) {
    return (
      <FeatureUnavailableState
        title="This payroll section is disabled"
        description="The client policy currently blocks this payroll feature."
        actionHref={buildHrmsLoginUrl()}
        actionLabel="Return to Portal"
      />
    );
  }

  return (
    <AppLayout
      sidebarItems={getPayrollSidebarItems(snapshot)}
      variant="payroll"
      user={{ email: user.email, role: user.role }}
      onLogout={onLogout}
    >
      {children}
    </AppLayout>
  );
}
