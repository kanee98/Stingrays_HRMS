'use client';

import { AppLayout } from '@shared/components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { hrmsSidebarItems } from '../config/sidebarItems';

const EMPLOYEE_UI_URL = process.env.NEXT_PUBLIC_EMPLOYEE_UI_URL || 'http://localhost:3001';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  const onLogout = () => {
    logout();
    window.location.href = `${EMPLOYEE_UI_URL}?logout=1`;
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
