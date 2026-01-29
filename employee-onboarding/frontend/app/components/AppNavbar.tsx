'use client';

import { AppNavbar as SharedNavbar } from '@shared/components/AppNavbar';
import { useAuth } from '../contexts/AuthContext';

const HRMS_URL = process.env.NEXT_PUBLIC_HRMS_URL || 'http://localhost:3000';

export function AppNavbar() {
  const { user } = useAuth();

  // Single logout: clear this app and redirect to central login (3000); 3000 will clear and show login
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

  return <SharedNavbar variant="employee" user={user} onLogout={onLogout} />;
}
