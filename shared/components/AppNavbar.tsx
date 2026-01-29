'use client';

const HRMS_URL = process.env.NEXT_PUBLIC_HRMS_URL || 'http://localhost:3000';
const EMPLOYEE_UI_URL = process.env.NEXT_PUBLIC_EMPLOYEE_UI_URL || 'http://localhost:3001';

export interface AppNavbarUser {
  email: string;
  role: string;
}

export interface AppNavbarProps {
  variant: 'hrms' | 'employee';
  user: AppNavbarUser | null;
  onLogout: () => void;
}

export function AppNavbar({ variant, user, onLogout }: AppNavbarProps) {
  const isHrms = variant === 'hrms';

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 min-h-16">
          <div className="flex items-center flex-1 min-w-0">
            <div className="flex-shrink-0">
              <a
                href={isHrms ? '/' : HRMS_URL}
                className="text-2xl font-bold text-indigo-600 hover:text-indigo-700"
              >
                HRMS
              </a>
            </div>
            <nav className="ml-10 flex space-x-8 flex-shrink-0">
              <a
                href={isHrms ? '/' : HRMS_URL}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
                  isHrms
                    ? 'text-gray-900 border-b-2 border-indigo-600 hover:text-indigo-600'
                    : 'text-gray-500 hover:text-indigo-600'
                }`}
              >
                Dashboard
              </a>
              <a
                href={EMPLOYEE_UI_URL}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
                  !isHrms
                    ? 'text-gray-900 border-b-2 border-indigo-600 hover:text-indigo-600'
                    : 'text-gray-500 hover:text-indigo-600'
                }`}
              >
                Employee Onboarding
              </a>
              <a
                href={isHrms ? '#' : `${HRMS_URL}#payroll`}
                className="text-gray-500 hover:text-indigo-600 px-3 py-2 text-sm font-medium whitespace-nowrap"
              >
                Payroll
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 ml-4">
            <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0 max-w-[240px] sm:max-w-[280px]">
              <span className="font-medium truncate" title={user?.email ?? ''}>
                {user?.email}
              </span>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full flex-shrink-0">
                {user?.role}
              </span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 border border-gray-300 rounded-lg hover:border-indigo-600 transition flex-shrink-0 whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
