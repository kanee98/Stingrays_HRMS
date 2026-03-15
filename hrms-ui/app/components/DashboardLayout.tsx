'use client';

import { AppLayout } from '@shared/components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { hrmsSidebarItems } from '../config/sidebarItems';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  const onLogout = () => {
    logout();
    // Run logout chain so 3001 and 3010 clear their session too
    window.location.href = '/?logout=1';
  };

  return (
    <AppLayout
      sidebarItems={hrmsSidebarItems}
      variant="hrms"
      user={user ? { email: user.email, role: user.role } : null}
      onLogout={onLogout}
      showFooter={true}
    >
      {children}
    </AppLayout>
  );
}
