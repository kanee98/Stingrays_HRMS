'use client';

import { getEmployeeUrl, getPayrollUrl } from '../lib/appUrls';
import { isServiceEnabled, useClientAccess } from '../services/clientAccess';
import { getHrmsAppUrl, getPortalUrl } from '../services/platformUrls';
import { ThemeToggle } from './ThemeToggle';

export interface AppNavbarUser {
  email: string;
  role: string;
}

export interface AppNavbarProps {
  variant: 'hrms' | 'employee' | 'payroll';
  user?: AppNavbarUser | null;
  onLogout?: () => void | Promise<void>;
}

export function AppNavbar({ variant, user = null, onLogout }: AppNavbarProps) {
  const isHrms = variant === 'hrms';
  const isEmployee = variant === 'employee';
  const isPayroll = variant === 'payroll';
  const activeClass = 'border-b-2 border-[var(--primary)] text-[var(--foreground)] hover:text-[var(--primary)]';
  const inactiveClass = 'text-[var(--muted)] hover:text-[var(--primary)]';

  const { snapshot } = useClientAccess();
  const portalUrl = getPortalUrl();
  const HRMS_URL = getHrmsAppUrl();
  const EMPLOYEE_UI_URL = getEmployeeUrl();
  const PAYROLL_URL = getPayrollUrl();
  const navItems = [
    { key: 'portal', href: portalUrl, label: 'Portal', isActive: false, isVisible: true },
    { key: 'hrms', href: HRMS_URL, label: 'HRMS', isActive: isHrms, isVisible: isServiceEnabled(snapshot, 'hrms') || snapshot == null },
    {
      key: 'employee-onboarding',
      href: EMPLOYEE_UI_URL,
      label: 'Employee Onboarding',
      isActive: isEmployee,
      isVisible: isServiceEnabled(snapshot, 'employee-onboarding') || snapshot == null,
    },
    {
      key: 'payroll',
      href: PAYROLL_URL,
      label: 'Payroll',
      isActive: isPayroll,
      isVisible: isServiceEnabled(snapshot, 'payroll') || snapshot == null,
    },
  ].filter((item) => item.isVisible);

  return (
    <header className="border-b border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 min-h-16">
          <div className="flex items-center flex-1 min-w-0">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold text-[var(--primary)]">Stingrays</span>
            </div>
            <nav className="ml-10 flex space-x-8 flex-shrink-0">
              {navItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${item.isActive ? activeClass : inactiveClass}`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 ml-4">
            <ThemeToggle />
            {user?.email != null && (
              <div className="flex items-center gap-2 text-sm text-[var(--muted-strong)] min-w-0 max-w-[240px] sm:max-w-[280px]">
                <span className="font-medium truncate" title={user?.email ?? ''}>
                  {user?.email}
                </span>
                <span className="rounded-full bg-[var(--primary-muted)] px-2 py-0.5 text-xs text-[var(--primary)] flex-shrink-0">
                  {user?.role}
                </span>
              </div>
            )}
            {onLogout != null && (
              <button
                type="button"
                onClick={() => {
                  void onLogout();
                }}
                className="rounded-lg border border-[var(--surface-border)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] flex-shrink-0 whitespace-nowrap"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
