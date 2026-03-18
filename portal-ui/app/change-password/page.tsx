'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { changePassword } from '@shared/lib/authClient';
import { isSafeRelativePath, isTrustedReturnUrl } from '@shared/lib/appUrls';
import { useAuth } from '../contexts/AuthContext';

const PASSWORD_REQUIREMENTS = [
  'At least 12 characters',
  'One lowercase letter',
  'One uppercase letter',
  'One number',
  'One symbol',
];

function validatePasswordStrength(password: string): string | null {
  if (!password.trim()) {
    return 'New password is required';
  }

  if (/\s/.test(password)) {
    return 'Password must not contain spaces';
  }

  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Password must be at least 12 characters and include uppercase, lowercase, number, and symbol characters';
  }

  return null;
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<ChangePasswordSpinner />}>
      <ChangePasswordForm />
    </Suspense>
  );
}

function ChangePasswordSpinner() {
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

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isLoading, refreshSession, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const nextPath = searchParams.get('next');

  const navigateAfterChange = useCallback(() => {
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
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <ChangePasswordSpinner />;
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation must match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from the current password');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      const refreshedUser = await refreshSession({ silent: true });
      if (!refreshedUser) {
        router.replace('/login');
        return;
      }

      navigateAfterChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
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
          <p className="text-sm mt-1 text-white/70">Password rotation required</p>
        </div>
        <div>
          <h2 className="max-w-sm text-3xl font-semibold leading-tight">
            Finish account setup by choosing a password that only you know.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-white/70">
            Platform-created and platform-reset accounts must rotate the assigned password before entering the workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void logout().then(() => {
              window.location.replace('/logout');
            });
          }}
          className="w-fit rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 hover:border-white/40 hover:text-white"
        >
          Sign out
        </button>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 bg-[var(--surface)]">
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="lg:hidden mb-8">
            <h1 className="text-xl font-bold text-[var(--foreground)]">Stingrays Workspace</h1>
            <p className="text-sm text-[var(--muted)]">Password rotation required</p>
          </div>

          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-1">Set a new password</h2>
          <p className="text-sm mb-8 text-[var(--muted)]">
            {user.mustChangePassword
              ? 'Your administrator assigned or reset this password. Change it now to continue.'
              : 'Update your password to keep your account secure.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-[var(--muted-strong)] mb-1.5">
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-[var(--muted-strong)] mb-1.5">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                placeholder="Create a strong password"
              />
              <div className="mt-3 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">
                {PASSWORD_REQUIREMENTS.map((requirement) => (
                  <p key={requirement}>{requirement}</p>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-[var(--muted-strong)] mb-1.5">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                placeholder="Re-enter your new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--primary)] py-2.5 font-medium text-white transition hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
