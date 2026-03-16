'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/clients', label: 'Clients' },
  { href: '/audit', label: 'Audit Logs' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--surface-border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Control Plane</p>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">Super Admin Console</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-[var(--foreground)]">{user?.fullName}</p>
              <p className="text-xs text-[var(--muted)]">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                window.location.replace('/login');
              }}
              className="rounded-xl border border-[var(--surface-border)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-[240px_minmax(0,1fr)] gap-6 px-6 py-6">
        <aside className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? 'bg-[var(--primary)] text-white shadow-[var(--shadow)]'
                      : 'text-[var(--muted-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
