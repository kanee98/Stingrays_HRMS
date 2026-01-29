'use client';

import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />
      <div className="flex">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
