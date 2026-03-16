'use client';

import { ThemeToggle } from '@shared/components/ThemeToggle';
import { getEmployeeUrl, getPayrollUrl } from '@shared/lib/appUrls';
import { isServiceEnabled, useClientAccess } from '@shared/services/clientAccess';
import { getHrmsAppUrl, getSuperAdminUrl } from '@shared/services/platformUrls';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

function SystemsHubContent() {
  const { user, logout } = useAuth();
  const { snapshot, error } = useClientAccess();

  const systems = [
    {
      id: 'hrms',
      key: 'hrms',
      title: 'HRMS',
      description: 'Dashboard, users, reports, and HR operations.',
      href: getHrmsAppUrl(),
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      ),
      gradient: 'from-indigo-500/20 to-violet-600/20',
      accent: 'text-indigo-600',
      delay: 0,
    },
    {
      id: 'onboarding',
      key: 'employee-onboarding',
      title: 'Employee Onboarding',
      description: 'Prospects, onboarding forms, and document collection.',
      href: getEmployeeUrl(),
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      ),
      gradient: 'from-emerald-500/20 to-teal-600/20',
      accent: 'text-emerald-600',
      delay: 100,
    },
    {
      id: 'payroll',
      key: 'payroll',
      title: 'Payroll',
      description: 'Pay runs, payslips, and compensation.',
      href: getPayrollUrl(),
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
      gradient: 'from-amber-500/20 to-orange-600/20',
      accent: 'text-amber-600',
      delay: 200,
    },
  ].filter((system) => snapshot == null || isServiceEnabled(snapshot, system.key));

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="flex items-center justify-between px-6 py-4 sm:px-8">
        <div>
          <span className="text-lg font-semibold text-[var(--foreground)] tracking-tight">Stingrays Workspace</span>
          <p className="text-xs text-[var(--muted)] mt-1">Client-aware service portal</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={getSuperAdminUrl()}
            className="hidden sm:inline-flex rounded-full border border-[var(--surface-border)] px-3 py-1.5 text-sm text-[var(--muted-strong)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            Super Admin
          </a>
          <ThemeToggle />
          {user?.email && (
            <span className="hidden sm:inline text-sm text-[var(--muted)] truncate max-w-[140px]">{user.email}</span>
          )}
          <button
            type="button"
            onClick={async () => {
              await logout();
              window.location.replace('/login');
            }}
            className="text-sm font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--foreground)]"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 pb-16 pt-4 sm:pt-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10 sm:mb-12 opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
              Your HR systems
            </h1>
            <p className="mt-2 text-[var(--muted)] text-lg">
              Choose a system to get started.
              {user?.email && <span className="text-[var(--muted)]"> Welcome back.</span>}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Client access policy could not be loaded. Direct links remain available, but service visibility may be incomplete.
            </div>
          )}

          {systems.length === 0 ? (
            <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">No services are enabled</h2>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Use the Super Admin microservice to enable services for the current client before accessing the workspace.
              </p>
              <a
                href={getSuperAdminUrl()}
                className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
              >
                Open Super Admin
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {systems.map((sys) => (
                <a
                  key={sys.id}
                  href={sys.href}
                  className="group relative overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-[var(--shadow-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 sm:p-7 opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${sys.delay}ms` }}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${sys.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    aria-hidden
                  />
                  <div className="relative">
                    <div className={`mb-4 inline-flex rounded-xl bg-[var(--surface-muted)] p-3 transition-transform duration-300 group-hover:scale-110 ${sys.accent}`}>
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sys.icon}
                      </svg>
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-[var(--foreground)]">{sys.title}</h2>
                    <p className="mb-4 text-sm leading-relaxed text-[var(--muted)]">{sys.description}</p>
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${sys.accent} group-hover:gap-2 transition-all`}>
                      Open
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
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
