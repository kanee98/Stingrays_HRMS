'use client';

import { AppLayout } from '@shared/components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { employeeSidebarItems } from '../config/sidebarItems';

const HRMS_URL = process.env.NEXT_PUBLIC_HRMS_URL || 'http://localhost:3000';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const onLogout = () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      document.cookie = 'auth_token=; path=/; max-age=0';
      window.location.href = `${HRMS_URL}?logout=1`;
    } catch {
      window.location.href = `${HRMS_URL}?logout=1`;
    }
  };

  return (
    <AppLayout
      sidebarItems={employeeSidebarItems}
      variant="employee"
      user={user ? { email: user.email, role: user.role } : null}
      onLogout={onLogout}
    >
      {children}
    </AppLayout>
  );
}
