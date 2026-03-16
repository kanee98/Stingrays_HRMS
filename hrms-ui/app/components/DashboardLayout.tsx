'use client';

import { usePathname } from 'next/navigation';
import { AppLayout } from '@shared/components/AppLayout';
import { FeatureUnavailableState } from '@shared/components/FeatureUnavailableState';
import { isSectionEnabled, isServiceEnabled, useClientAccess } from '@shared/services/clientAccess';
import { getPortalUrl } from '@shared/services/platformUrls';
import { useAuth } from '../contexts/AuthContext';
import { getHrmsSectionFromPath, getHrmsSidebarItems } from '../config/sidebarItems';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { snapshot, isLoading } = useClientAccess();
  const portalUrl = getPortalUrl();
  const sectionKey = getHrmsSectionFromPath(pathname);

  const onLogout = async () => {
    await logout();
    window.location.replace(portalUrl);
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

  if (!isServiceEnabled(snapshot, 'hrms')) {
    return (
      <FeatureUnavailableState
        title="HRMS is disabled for this client"
        description="Enable the HRMS service for this client from the Super Admin console before opening the module."
        actionHref={portalUrl}
        actionLabel="Return to Portal"
      />
    );
  }

  if (sectionKey && !isSectionEnabled(snapshot, 'hrms', sectionKey)) {
    return (
      <FeatureUnavailableState
        title="This HRMS section is disabled"
        description="The current client does not have access to this HRMS section. Update the client section policy in Super Admin to restore it."
        actionHref={portalUrl}
        actionLabel="Return to Portal"
      />
    );
  }

  return (
    <AppLayout
      sidebarItems={getHrmsSidebarItems(snapshot)}
      variant="hrms"
      user={user ? { email: user.email, role: user.role } : null}
      onLogout={onLogout}
      showFooter={true}
    >
      {children}
    </AppLayout>
  );
}
