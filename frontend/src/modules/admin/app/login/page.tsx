'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { adminPath } from '../lib/routes';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(adminPath('/dashboard'));
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      router.replace(adminPath('/dashboard'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--background)] lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden overflow-hidden lg:flex">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0e1b2f_0%,#123565_55%,#155eef_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%)]" />
        <div className="relative z-10 flex w-full flex-col justify-between px-14 py-12 text-[var(--surface-strong-foreground)]">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/68">FusionLabz Platform</p>
            <h1 className="mt-5 text-5xl font-semibold leading-tight">
              Govern tenants, product rollout, and privileged activity from one control center.
            </h1>
            <p className="mt-5 text-base leading-7 text-white/78">
              The Super Admin workspace is built for FusionLabz platform operators managing tenant provisioning, module
              rollout, operational status, and audit oversight.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              eyebrow="Provision"
              title="Tenant lifecycle"
              body="Create workspaces, assign ownership, and manage active, pilot, inactive, or suspended states."
            />
            <FeatureCard
              eyebrow="Govern"
              title="Product access"
              body="Stage product and module access before rollout, with optional JSON policy overrides where needed."
            />
            <FeatureCard
              eyebrow="Audit"
              title="Trace changes"
              body="Review sign-ins, access policy mutations, and operational changes across the platform."
            />
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-lg)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--primary)]">Super Admin Workspace</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">Sign in to continue</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Use your FusionLabz platform administrator credentials to manage tenant provisioning, access policy, and audit review.
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
                placeholder="superadmin@fusionlabz.lk"
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

          <div className="mt-6 rounded-2xl bg-[var(--surface-muted)] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Demo Access</p>
            <p className="mt-2 text-xs leading-6 text-[var(--muted-strong)]">
              Seed credentials:
              <code className="ml-1 rounded bg-white px-1.5 py-0.5">{'superadmin@fusionlabz.lk / SuperAdmin@123'}</code>
            </p>
          </div>

          <p className="mt-4 text-xs leading-6 text-[var(--muted)]">
            Access to this console should be restricted to platform operators and monitored through the audit trail.
          </p>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/62">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/78">{body}</p>
    </div>
  );
}
