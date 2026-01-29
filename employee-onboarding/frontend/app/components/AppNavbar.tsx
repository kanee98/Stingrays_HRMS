'use client';

import { AppNavbar as SharedNavbar } from '@shared/components/AppNavbar';
import { useAuth } from '../contexts/AuthContext';

const HRMS_URL = process.env.NEXT_PUBLIC_HRMS_URL || 'http://localhost:3000';

export function AppNavbar() {
  const { user, logout } = useAuth();

  const onLogout = () => {
    logout();
    window.location.href = `${HRMS_URL}/login`;
  };

  return <SharedNavbar variant="employee" user={user} onLogout={onLogout} />;
}
