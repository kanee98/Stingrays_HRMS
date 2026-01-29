'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

function LoginSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <svg
          className="animate-spin h-10 w-10 text-indigo-600 mx-auto"
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

  useEffect(() => {
    if (!isLoading && user) {
      if (returnUrl && typeof returnUrl === 'string' && returnUrl.startsWith('http')) {
        try {
          const token = localStorage.getItem('auth_token') || '';
          const userJson = localStorage.getItem('auth_user') || '';
          const hash = `#token=${encodeURIComponent(token)}&user=${encodeURIComponent(userJson)}`;
          window.location.href = returnUrl + hash;
        } catch {
          router.replace('/');
        }
      } else {
        router.replace('/');
      }
    }
  }, [user, isLoading, router, returnUrl]);

  if (isLoading) {
    return <LoginSpinner />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (returnUrl && typeof returnUrl === 'string' && returnUrl.startsWith('http')) {
        const token = localStorage.getItem('auth_token');
        const userJson = localStorage.getItem('auth_user');
        const hash = `#token=${encodeURIComponent(token || '')}&user=${encodeURIComponent(userJson || '')}`;
        window.location.href = returnUrl + hash;
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-800 flex-col justify-between p-12 text-white">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stingrays HRMS</h1>
          <p className="text-slate-400 text-sm mt-1">Human Resources Management System</p>
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight max-w-sm">
            One platform for payroll, onboarding, and people operations.
          </h2>
          <p className="text-slate-400 mt-4 max-w-sm text-sm">
            Sign in with your company credentials to access the HR portal, employee onboarding, and more.
          </p>
        </div>
        <p className="text-slate-500 text-xs">
          © Stingrays Global Intellectual Property. All rights reserved.Designed and built by{' '}
          <a
            href="https://fusionlabz.lk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 font-medium transition"
          >
            FusionLabz.lk
          </a>
        </p>
      </div>

      {/* Right: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <div className="lg:hidden mb-8">
            <h1 className="text-xl font-bold text-slate-900">Stingrays HRMS</h1>
            <p className="text-slate-500 text-sm">Human Resources Management System</p>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Sign in</h2>
          <p className="text-slate-600 text-sm mb-8">Enter your credentials to access your account.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <a href="#" className="text-sm text-indigo-600 hover:text-indigo-700">
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-slate-600">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
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

          <p className="mt-8 text-slate-500 text-sm">
            Demo: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 text-xs">admin@stingrays.com</code>
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
