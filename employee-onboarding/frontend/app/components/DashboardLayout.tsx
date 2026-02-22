'use client';

import { AppLayout } from '@shared/components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { employeeSidebarItems } from '../config/sidebarItems';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const onLogout = () => {
    // Clear storage and redirect immediately — do NOT call logout() or setState so nothing re-renders before navigate
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    document.cookie = 'auth_token=; path=/; max-age=0';
    window.location.replace(`${window.location.origin}/?logout=1`);
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
