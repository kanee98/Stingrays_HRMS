'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { isSafeRelativePath, isTrustedReturnUrl } from '@shared/lib/appUrls';
import { useAuth } from '../contexts/AuthContext';

function LoginSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        <svg
          className="animate-spin h-10 w-10 text-[var(--primary)] mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const nextPath = searchParams.get('next');

  const navigateAfterLogin = useCallback(() => {
    if (isTrustedReturnUrl(returnUrl)) {
      window.location.replace(returnUrl);
      return;
    }

    if (isSafeRelativePath(nextPath)) {
      router.replace(nextPath);
      return;
    }

    router.replace('/');
  }, [nextPath, returnUrl, router]);

  useEffect(() => {
    if (!isLoading && user) {
      navigateAfterLogin();
    }
  }, [user, isLoading, navigateAfterLogin]);

  if (isLoading) {
    return <LoginSpinner />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigateAfterLogin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-[var(--surface-strong)] flex-col justify-between p-12 text-[var(--surface-strong-foreground)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stingrays Workspace</h1>
          <p className="text-sm mt-1 text-white/70">Central access portal</p>
        </div>
        <div>
          <h2 className="max-w-sm text-3xl font-semibold leading-tight">
            Sign in once, then move between HRMS, onboarding, payroll, and tenant-specific modules.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-white/70">
            This portal is the default landing page and the shared entry point for all client-enabled services.
          </p>
        </div>
        <p className="text-xs text-white/55">
          Stingrays Global Intellectual Property. All rights reserved. Designed and built by{' '}
          <a
            href="https://fusionlabz.lk"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white transition hover:text-[var(--primary-hover)]"
          >
            FusionLabz.lk
          </a>
        </p>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 bg-[var(--surface)]">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <div className="lg:hidden mb-8">
            <h1 className="text-xl font-bold text-[var(--foreground)]">Stingrays Workspace</h1>
            <p className="text-sm text-[var(--muted)]">Central access portal</p>
          </div>

          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-1">Sign in</h2>
          <p className="text-sm mb-8 text-[var(--muted)]">Enter your credentials to access your client workspace.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--muted-strong)] mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--foreground)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-[var(--muted-strong)]">
                  Password
                </label>
                <a href="#" className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)]">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--foreground)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                placeholder="........"
              />
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--surface-border)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-[var(--muted)]">
                Keep me signed in on this device
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--primary)] py-2.5 font-medium text-white transition hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-8 text-sm text-[var(--muted)]">
            Demo: <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs text-[var(--muted-strong)]">admin@stingrays.com</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSpinner />}>
      <LoginForm />
    </Suspense>
  );
}
