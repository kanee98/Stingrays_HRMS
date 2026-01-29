'use client';

import { AppNavbar as SharedNavbar } from '@shared/components/AppNavbar';
import { useAuth } from '../contexts/AuthContext';

const EMPLOYEE_UI_URL = process.env.NEXT_PUBLIC_EMPLOYEE_UI_URL || 'http://localhost:3001';

export function AppNavbar() {
  const { user, logout } = useAuth();

  const onLogout = () => {
    logout();
    window.location.href = `${EMPLOYEE_UI_URL}?logout=1`;
  };

  return <SharedNavbar variant="hrms" user={user} onLogout={onLogout} />;
}
