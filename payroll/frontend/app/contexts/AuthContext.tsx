'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { getSession, logoutSession, type AuthUser } from '@shared/lib/authClient';

interface AuthContextType {
  user: AuthUser | null;
  logout: () => Promise<void>;
  refreshSession: (options?: { silent?: boolean }) => Promise<AuthUser | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(false);

  const refreshSession = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent && isMountedRef.current) {
      setIsLoading(true);
    }

    try {
      const nextUser = await getSession();
      if (isMountedRef.current) {
        setUser(nextUser);
      }
      return nextUser;
    } catch {
      if (isMountedRef.current) {
        setUser(null);
      }
      return null;
    } finally {
      if (!silent && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    isMountedRef.current = true;
    void refreshSession();

    const revalidateSession = () => {
      if (document.visibilityState !== 'hidden') {
        void refreshSession({ silent: true });
      }
    };

    window.addEventListener('focus', revalidateSession);
    document.addEventListener('visibilitychange', revalidateSession);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('focus', revalidateSession);
      document.removeEventListener('visibilitychange', revalidateSession);
    };
  }, [refreshSession]);

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      if (isMountedRef.current) {
        setUser(null);
      }
    }
  }, []);

  const value = useMemo(
    () => ({ user, logout, refreshSession, isLoading }),
    [user, logout, refreshSession, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
