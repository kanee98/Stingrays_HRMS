'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--background)] lg:grid-cols-[1.2fr_0.8fr]">
      <section className="hidden lg:flex flex-col justify-between bg-[var(--surface-strong)] px-14 py-12 text-[var(--surface-strong-foreground)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Control Plane</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Govern clients, switch services on and off, and manage module-level access from one console.
          </h1>
        </div>
        <div className="grid gap-4 text-sm text-white/70">
          <p>Client tenancy and environment policy</p>
          <p>Service-level and section-level enablement</p>
          <p>Audit logging and controlled rollout management</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-lg)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--primary)]">Super Admin</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">Sign in</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Use your Super Admin credentials to manage client tenancy and module governance.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                placeholder="superadmin@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-2xl border border-[var(--surface-border)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-xs text-[var(--muted)]">
            Seed credentials: <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">{'superadmin@stingrays.com / SuperAdmin@123'}</code>
          </p>
        </div>
      </section>
    </div>
  );
}
