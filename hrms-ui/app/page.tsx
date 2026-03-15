'use client';

import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

const EMPLOYEE_UI_URL = process.env.NEXT_PUBLIC_EMPLOYEE_UI_URL || 'http://localhost:3001';
const PAYROLL_URL = process.env.NEXT_PUBLIC_PAYROLL_URL || 'http://localhost:3010';

function SystemsHubContent() {
  const { user, logout } = useAuth();

  const openHrmsDashboard = () => {
    window.location.href = '/dashboard';
  };

  const openEmployeeOnboarding = () => {
    window.location.href = EMPLOYEE_UI_URL;
  };

  const openPayroll = () => {
    window.location.href = PAYROLL_URL;
  };

  const systems = [
    {
      id: 'hrms',
      title: 'HRMS',
      description: 'Dashboard, users, reports, and HR operations.',
      href: '/dashboard',
      onClick: openHrmsDashboard,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      ),
      gradient: 'from-indigo-500/20 to-violet-600/20',
      accent: 'text-indigo-600',
      delay: 0,
    },
    {
      id: 'onboarding',
      title: 'Employee Onboarding',
      description: 'Prospects, onboarding forms, and document collection.',
      onClick: openEmployeeOnboarding,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      ),
      gradient: 'from-emerald-500/20 to-teal-600/20',
      accent: 'text-emerald-600',
      delay: 100,
    },
    {
      id: 'payroll',
      title: 'Payroll',
      description: 'Pay runs, payslips, and compensation.',
      onClick: openPayroll,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
      gradient: 'from-amber-500/20 to-orange-600/20',
      accent: 'text-amber-600',
      delay: 200,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Minimal header: no navbar, only logout */}
      <header className="flex items-center justify-between px-6 py-4 sm:px-8">
        <span className="text-lg font-semibold text-slate-800 tracking-tight">Stingrays HRMS</span>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="hidden sm:inline text-sm text-slate-500 truncate max-w-[140px]">{user.email}</span>
          )}
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = '/?logout=1';
            }}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 pb-16 pt-4 sm:pt-8">
        <div className="max-w-4xl mx-auto">
          <div
            className="mb-10 sm:mb-12 opacity-0 animate-fade-in"
            style={{ animationDelay: '0ms' }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Your HR systems
            </h1>
            <p className="mt-2 text-slate-600 text-lg">
              Choose a system to get started.
              {user?.email && <span className="text-slate-500"> Welcome back.</span>}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {systems.map((sys) => (
              <div
                key={sys.id}
                role="button"
                tabIndex={0}
                onClick={sys.onClick}
                onKeyDown={(e) => e.key === 'Enter' && sys.onClick()}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-6 sm:p-7 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${sys.delay}ms` }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${sys.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  aria-hidden
                />
                <div className="relative">
                  <div className={`inline-flex rounded-xl bg-slate-100 p-3 mb-4 transition-transform duration-300 group-hover:scale-110 ${sys.accent}`}>
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {sys.icon}
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">{sys.title}</h2>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">{sys.description}</p>
                  <span className={`inline-flex items-center gap-1 text-sm font-medium ${sys.accent} group-hover:gap-2 transition-all`}>
                    Open
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <SystemsHubContent />
    </ProtectedRoute>
  );
}
