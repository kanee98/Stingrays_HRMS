'use client';

import { ReactNode } from 'react';
import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';
import { AppFooter } from './AppFooter';
import type { AppSidebarItem } from './AppSidebar';
import type { AppNavbarUser } from './AppNavbar';

export interface AppLayoutProps {
  /** Microservice-specific sidebar links (each app passes its own items) */
  sidebarItems: AppSidebarItem[];
  /** Which microservice is active (for topbar highlight) */
  variant: 'hrms' | 'employee' | 'payroll';
  /** Page content - the body changes per microservice and per route */
  children: ReactNode;
  /** Optional: current user for topbar (from auth) */
  user?: AppNavbarUser | null;
  /** Optional: logout handler for topbar */
  onLogout?: () => void | Promise<void>;
  /** Whether to show the footer (default true) */
  showFooter?: boolean;
}

/**
 * Uniform layout for all microservices: topbar (constants) + sidebar (props) + body (children) + footer (constants).
 * Defined in hrms-ui/shared; each microservice feeds sidebarItems and renders its pages as children.
 */
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
      {/* Topbar - constant structure, same across all microservices */}
      <AppNavbar variant={variant} user={user} onLogout={onLogout} />

      {/* Sidebar + Body - sidebar takes props, body is dynamic per microservice */}
      <div className="flex flex-1 min-h-0">
        <AppSidebar items={sidebarItems} />
        <main className="min-w-0 flex-1 overflow-auto bg-[var(--background)] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Footer - constant, same across all microservices */}
      {showFooter && <AppFooter />}
    </div>
  );
}
