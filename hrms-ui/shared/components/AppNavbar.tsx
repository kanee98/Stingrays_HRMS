'use client';

/** Base domain (e.g. stingraysglobal.com) when on subdomain; null on localhost */
function getBaseDomain(): string | null {
  if (typeof window === 'undefined' || window.location.hostname === 'localhost') return null;
  const parts = window.location.hostname.split('.');
  return parts.length >= 2 ? parts.slice(-2).join('.') : null;
}

/** Same host + port for localhost; subdomain URL (no port) when on subdomain */
function appUrl(port: number) {
  if (typeof window === 'undefined') return `http://localhost:${port}`;
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

function getHrmsUrl(): string {
  const base = getBaseDomain();
  if (base) return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//hrms.${base}`;
  return appUrl(3000);
}

function getEmployeeUrl(): string {
  const base = getBaseDomain();
  if (base) return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//employee.${base}`;
  return appUrl(3001);
}

function getPayrollUrl(): string {
  const base = getBaseDomain();
  if (base) return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//payroll.${base}`;
  return appUrl(3010);
}

export interface AppNavbarUser {
  email: string;
  role: string;
}

export interface AppNavbarProps {
  variant: 'hrms' | 'employee' | 'payroll';
  user?: AppNavbarUser | null;
  onLogout?: () => void;
}

export function AppNavbar({ variant, user = null, onLogout }: AppNavbarProps) {
  const isHrms = variant === 'hrms';
  const isEmployee = variant === 'employee';
  const isPayroll = variant === 'payroll';
  const activeClass = 'text-gray-900 border-b-2 border-indigo-600 hover:text-indigo-600';
  const inactiveClass = 'text-gray-500 hover:text-indigo-600';

  const HRMS_URL = getHrmsUrl();
  const EMPLOYEE_UI_URL = getEmployeeUrl();
  const PAYROLL_URL = getPayrollUrl();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 min-h-16">
          <div className="flex items-center flex-1 min-w-0">
            <div className="flex-shrink-0">
              <a
                href={isHrms ? '/' : isPayroll ? PAYROLL_URL : HRMS_URL}
                className="text-2xl font-bold text-indigo-600 hover:text-indigo-700"
              >
                HRMS
              </a>
            </div>
            <nav className="ml-10 flex space-x-8 flex-shrink-0">
              <a
                href={HRMS_URL}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${isHrms ? activeClass : inactiveClass}`}
              >
                Dashboard
              </a>
              <a
                href={EMPLOYEE_UI_URL}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${isEmployee ? activeClass : inactiveClass}`}
              >
                Employee Onboarding
              </a>
              <a
                href={PAYROLL_URL}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${isPayroll ? activeClass : inactiveClass}`}
              >
                Payroll
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 ml-4">
            {user?.email != null && (
              <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0 max-w-[240px] sm:max-w-[280px]">
                <span className="font-medium truncate" title={user?.email ?? ''}>
                  {user?.email}
                </span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full flex-shrink-0">
                  {user?.role}
                </span>
              </div>
            )}
            {onLogout != null && (
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 border border-gray-300 rounded-lg hover:border-indigo-600 transition flex-shrink-0 whitespace-nowrap"
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
