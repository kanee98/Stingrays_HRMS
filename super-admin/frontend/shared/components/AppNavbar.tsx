'use client';

import { getEmployeeUrl, getPayrollUrl } from '../lib/appUrls';
import { isServiceEnabled, useClientAccess } from '../services/clientAccess';
import { getHrmsAppUrl, getPortalUrl, getSuperAdminUrl } from '../services/platformUrls';
import { ThemeToggle } from './ThemeToggle';

export interface AppNavbarUser {
  email: string;
  role: string;
}

export interface AppNavbarProps {
  variant: 'hrms' | 'employee' | 'payroll' | 'admin';
  user?: AppNavbarUser | null;
  onLogout?: () => void | Promise<void>;
}

type ModuleVariant = AppNavbarProps['variant'];

interface ModuleMeta {
  label: string;
  eyebrow: string;
  description: string;
}

interface ServiceNavItem {
  key: string;
  href: string;
  label: string;
  eyebrow: string;
  description: string;
  icon: string;
  isActive: boolean;
  isVisible: boolean;
}

const moduleMeta: Record<ModuleVariant, ModuleMeta> = {
  hrms: {
    label: 'HRMS',
    eyebrow: 'Core operations',
    description: 'People records, workforce policies, and day-to-day administration.',
  },
  employee: {
    label: 'Employee Onboarding',
    eyebrow: 'Talent transition',
    description: 'Prospects, onboarding workflows, documents, and readiness tracking.',
  },
  payroll: {
    label: 'Payroll',
    eyebrow: 'Compensation',
    description: 'Pay runs, deductions, compliance, and payroll reporting.',
  },
  admin: {
    label: 'Platform Administration',
    eyebrow: 'Governance',
    description: 'Tenant provisioning, rollout control, and privileged audit oversight.',
  },
};

function getUserInitials(user: AppNavbarUser | null): string {
  if (!user?.email) {
    return 'FL';
  }

  const [localPart] = user.email.split('@');
  const tokens = localPart.split(/[._-]/).filter(Boolean);

  if (tokens.length >= 2) {
    return `${tokens[0][0] ?? ''}${tokens[1][0] ?? ''}`.toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase();
}

function NavIcon({ path }: { path: string }) {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    </svg>
  );
}

export function AppNavbar({ variant, user = null, onLogout }: AppNavbarProps) {
  const isHrms = variant === 'hrms';
  const isEmployee = variant === 'employee';
  const isPayroll = variant === 'payroll';
  const isAdmin = variant === 'admin';
  const { snapshot } = useClientAccess(undefined, !isAdmin);
  const portalUrl = getPortalUrl();
  const hrmsUrl = getHrmsAppUrl();
  const employeeUrl = getEmployeeUrl();
  const payrollUrl = getPayrollUrl();
  const superAdminUrl = getSuperAdminUrl();

  const currentModule = moduleMeta[variant];
  const serviceItems: ServiceNavItem[] = isAdmin
    ? [
        {
          key: 'super-admin',
          href: superAdminUrl,
          label: 'Admin',
          eyebrow: 'Governance',
          description: 'Platform-wide tenant governance, rollout control, and audit visibility.',
          icon: 'M12 3 4.5 7v5.5c0 4.3 2.7 7.8 7.5 8.5 4.8-.7 7.5-4.2 7.5-8.5V7L12 3Zm-3 9.25 2 2 4-4.5',
          isActive: true,
          isVisible: true,
        },
      ]
    : [
        {
          key: 'hrms',
          href: hrmsUrl,
          label: 'HRMS',
          eyebrow: 'Operations',
          description: 'Manage employees, attendance, leave, and core HR settings.',
          icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
          isActive: isHrms,
          isVisible: isServiceEnabled(snapshot, 'hrms') || snapshot == null,
        },
        {
          key: 'employee-onboarding',
          href: employeeUrl,
          label: 'Onboarding',
          eyebrow: 'Hiring',
          description: 'Move candidates into structured onboarding workflows.',
          icon: 'M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z',
          isActive: isEmployee,
          isVisible: isServiceEnabled(snapshot, 'employee-onboarding') || snapshot == null,
        },
        {
          key: 'payroll',
          href: payrollUrl,
          label: 'Payroll',
          eyebrow: 'Pay cycle',
          description: 'Run payroll, manage deductions, and review outputs.',
          icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          isActive: isPayroll,
          isVisible: isServiceEnabled(snapshot, 'payroll') || snapshot == null,
        },
      ].filter((item) => item.isVisible);
  const visibleModules = serviceItems.length;

  return (
    <header className="border-b border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-sm font-semibold tracking-[0.3em] text-[var(--surface-strong-foreground)]">
                  FL
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                    FusionLabz Platform
                  </p>
                  <p className="truncate text-lg font-semibold text-[var(--foreground)]">
                    Unified Workforce Operations
                  </p>
                </div>
              </div>

              <div className="hidden h-10 w-px bg-[var(--surface-border)] sm:block" />

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  {currentModule.eyebrow}
                </p>
                <p className="text-sm font-semibold text-[var(--foreground)]">{currentModule.label}</p>
                <p className="text-sm text-[var(--muted)]">{currentModule.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--muted)]">
                {visibleModules} active module{visibleModules === 1 ? '' : 's'}
              </div>
              <ThemeToggle />
              {user?.email != null && (
                <div className="flex max-w-full items-center gap-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-muted)] text-sm font-semibold text-[var(--primary)]">
                    {getUserInitials(user)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]" title={user.email}>
                      {user.email}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{user.role}</p>
                  </div>
                </div>
              )}
              {onLogout != null && (
                <button
                  type="button"
                  onClick={() => {
                    void onLogout();
                  }}
                  className="rounded-xl border border-[var(--surface-border)] px-4 py-2.5 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-muted)] hover:text-[var(--primary)]"
                >
                  Logout
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <a
                href={portalUrl}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <NavIcon path="M3 10.5l9-7 9 7M5 9.5V20h14V9.5M9 20v-6h6v6" />
                <span>Portal Home</span>
              </a>

              <div className="min-w-0 flex-1 overflow-x-auto pb-1">
                <nav className="flex min-w-max items-stretch gap-2 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-1">
                  {serviceItems.map((item) => (
                    <a
                      key={item.key}
                      href={item.href}
                      title={item.description}
                      aria-current={item.isActive ? 'page' : undefined}
                      className={`group flex min-w-[11rem] items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                        item.isActive
                          ? 'bg-[var(--surface-strong)] text-[var(--surface-strong-foreground)] shadow-[var(--shadow)]'
                          : 'text-[var(--muted-strong)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${
                          item.isActive
                            ? 'border-white/10 bg-white/10 text-white'
                            : 'border-[var(--surface-border)] bg-[var(--surface)] text-[var(--primary)] group-hover:border-[var(--primary)]'
                        }`}
                      >
                        <NavIcon path={item.icon} />
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-[11px] font-semibold uppercase tracking-[0.2em] ${
                            item.isActive ? 'text-white/70' : 'text-[var(--muted)]'
                          }`}
                        >
                          {item.eyebrow}
                        </span>
                        <span className="block truncate text-sm font-semibold">{item.label}</span>
                      </span>
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            <p className="text-xs text-[var(--muted)] lg:max-w-[18rem] lg:text-right">
              {isAdmin ? 'Govern the platform from the same shell used by the product modules.' : 'Switch modules without leaving your signed-in workspace.'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
