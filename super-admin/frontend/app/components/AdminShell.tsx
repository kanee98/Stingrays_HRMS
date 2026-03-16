'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/adminUi';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Platform health, rollout posture, and action queues.',
    icon: 'dashboard',
  },
  {
    href: '/clients',
    label: 'Tenant Directory',
    description: 'Provision workspaces, manage status, and review product coverage.',
    icon: 'tenants',
  },
  {
    href: '/audit',
    label: 'Audit Trail',
    description: 'Review sign-ins, policy changes, and platform governance activity.',
    icon: 'audit',
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const activeItem =
    navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) || navItems[0];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--surface-border)]/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--surface-strong-foreground)] shadow-[var(--shadow)]">
              <ControlPlaneMark />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">
                Platform Administration
              </p>
              <h1 className="text-xl font-semibold text-[var(--foreground)]">Stingrays Control Center</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">{activeItem.description}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 lg:justify-end">
            <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 text-right shadow-[var(--shadow)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Signed in as
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{user?.fullName}</p>
              <p className="text-xs text-[var(--muted)]">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                window.location.replace('/login');
              }}
              className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--muted-strong)] shadow-[var(--shadow)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
            <nav className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-3xl border px-4 py-4 transition',
                      active
                        ? 'border-transparent bg-[var(--surface-strong)] text-[var(--surface-strong-foreground)] shadow-[var(--shadow)]'
                        : 'border-[var(--surface-border)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[var(--primary)] hover:text-[var(--primary)]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                          active ? 'bg-white/12 text-white' : 'bg-[var(--surface-muted)] text-[var(--primary)]',
                        )}
                      >
                        <NavIcon kind={item.icon} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className={cn('mt-1 text-xs leading-5', active ? 'text-white/72' : 'text-[var(--muted)]')}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">Operating Scope</p>
            <h2 className="mt-3 text-lg font-semibold text-[var(--foreground)]">Control plane standards</h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted-strong)]">
              <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
                Tenant lifecycle and service availability are governed from one workspace.
              </div>
              <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
                Product access can be staged before rollout using module-level policy controls.
              </div>
              <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
                Every privileged sign-in and policy change is captured in the audit trail.
              </div>
            </div>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

function ControlPlaneMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4.5 7v5.5c0 4.3 2.7 7.8 7.5 8.5 4.8-.7 7.5-4.2 7.5-8.5V7L12 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.25 11 14.25l4-4.5" />
    </svg>
  );
}

function NavIcon({ kind }: { kind: string }) {
  if (kind === 'tenants') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M6.5 20V6.5L12 4l5.5 2.5V20M9 10h.01M9 13.5h.01M9 17h.01M15 10h.01M15 13.5h.01M15 17h.01" />
      </svg>
    );
  }

  if (kind === 'audit') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12 11 13.5l3.5-4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM13 10h7v10h-7V10ZM4 13h7v7H4v-7Z" />
    </svg>
  );
}
