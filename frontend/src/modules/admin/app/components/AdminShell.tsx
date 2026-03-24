'use client';

import { AppLayout } from '@shared/components/AppLayout';
import { sidebarItems } from '../config/sidebarItems';
import { useAuth } from '../contexts/AuthContext';
import { adminPath } from '../lib/routes';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <AppLayout
      variant="admin"
      sidebarItems={sidebarItems}
      user={user ? { email: user.email, role: 'Super Admin' } : null}
      onLogout={async () => {
        await logout();
        window.location.replace(adminPath('/login'));
      }}
    >
      {children}
    </AppLayout>
  );
}
