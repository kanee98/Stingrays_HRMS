'use client';

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/** HRMS login URL: use hrms subdomain when on subdomain, else env or localhost */
function getHrmsUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const parts = window.location.hostname.split('.');
    if (parts.length >= 2) return `${window.location.protocol}//hrms.${parts.slice(-2).join('.')}`;
  }
  return process.env.NEXT_PUBLIC_HRMS_URL || 'http://localhost:3000';
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      const returnUrl = encodeURIComponent(
        typeof window !== 'undefined' ? window.location.origin : ''
      );
      window.location.href = `${getHrmsUrl()}/login?returnUrl=${returnUrl}`;
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-indigo-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
