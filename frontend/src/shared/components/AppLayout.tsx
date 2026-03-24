'use client';

import { ReactNode } from 'react';
import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';
import { AppFooter } from './AppFooter';
import type { AppSidebarItem } from './AppSidebar';
import type { AppNavbarUser } from './AppNavbar';

export interface AppLayoutProps {
  sidebarItems: AppSidebarItem[];
  variant: 'hrms' | 'employee' | 'payroll' | 'admin';
  children: ReactNode;
  user?: AppNavbarUser | null;
  onLogout?: () => void | Promise<void>;
  showFooter?: boolean;
}

export function AppLayout({
  sidebarItems,
  variant,
  children,
  user = null,
  onLogout,
  showFooter = true,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <AppNavbar variant={variant} user={user} onLogout={onLogout} />

      <div className="flex flex-1 min-h-0">
        <AppSidebar items={sidebarItems} />
        <main className="min-w-0 flex-1 overflow-auto bg-[var(--background)] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {showFooter && <AppFooter />}
    </div>
  );
}