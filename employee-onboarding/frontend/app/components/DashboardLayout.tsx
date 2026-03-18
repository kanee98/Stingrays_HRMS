'use client';

import { usePathname } from 'next/navigation';
import { AppLayout } from '@shared/components/AppLayout';
import { FeatureUnavailableState } from '@shared/components/FeatureUnavailableState';
import { isSectionEnabled, isServiceEnabled, useClientAccess } from '@shared/services/clientAccess';
import { buildPortalLogoutUrl, getPortalUrl } from '@shared/services/platformUrls';
import { useAuth } from '../contexts/AuthContext';
import { getEmployeeSectionFromPath, getEmployeeSidebarItems } from '../config/sidebarItems';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { snapshot, isLoading } = useClientAccess();
  const sectionKey = getEmployeeSectionFromPath(pathname);
  const portalUrl = getPortalUrl();

  const onLogout = async () => {
    await logout();
    window.location.replace(buildPortalLogoutUrl());
  };

  if (isLoading) {
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
          <p className="mt-4 text-sm text-[var(--muted)]">Loading access policy...</p>
        </div>
      </div>
    );
  }

  if (!isServiceEnabled(snapshot, 'employee-onboarding')) {
    return (
      <FeatureUnavailableState
        title="Employee Onboarding is disabled"
        description="This client does not currently have access to the onboarding service."
        actionHref={portalUrl}
        actionLabel="Return to Portal"
      />
    );
  }

  if (sectionKey && !isSectionEnabled(snapshot, 'employee-onboarding', sectionKey)) {
    return (
      <FeatureUnavailableState
        title="This onboarding section is disabled"
        description="Enable the section from the Super Admin client policy to make it available again."
        actionHref={portalUrl}
        actionLabel="Return to Portal"
      />
    );
  }

  return (
    <AppLayout
      sidebarItems={getEmployeeSidebarItems(snapshot)}
      variant="employee"
      user={user ? { email: user.email, role: user.role } : null}
      onLogout={onLogout}
    >
      {children}
    </AppLayout>
  );
}
