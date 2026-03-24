'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { getSession, logoutSession, type AuthUser } from '@shared/lib/authClient';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshSession: (options?: { silent?: boolean }) => Promise<AuthUser | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(false);
  const authMutationRef = useRef(0);
  const refreshRequestRef = useRef(0);
  const logoutInFlightRef = useRef(false);

  const refreshSession = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (logoutInFlightRef.current) {
      return null;
    }

    const mutationId = authMutationRef.current;
    const refreshId = ++refreshRequestRef.current;
    if (!silent && isMountedRef.current) {
      setIsLoading(true);
    }

    try {
      const nextUser = await getSession();
      if (
        isMountedRef.current &&
        !logoutInFlightRef.current &&
        mutationId === authMutationRef.current &&
        refreshId === refreshRequestRef.current
      ) {
        setUser(nextUser);
      }
      return nextUser;
    } catch {
      if (
        isMountedRef.current &&
        !logoutInFlightRef.current &&
        mutationId === authMutationRef.current &&
        refreshId === refreshRequestRef.current
      ) {
        setUser(null);
      }
      return null;
    } finally {
      if (
        !silent &&
        isMountedRef.current &&
        mutationId === authMutationRef.current &&
        refreshId === refreshRequestRef.current
      ) {
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

  const login = useCallback(async () => {
    throw new Error('Please log in via the main HRMS app.');
  }, []);

  const logout = useCallback(async () => {
    const mutationId = ++authMutationRef.current;
    logoutInFlightRef.current = true;

    if (isMountedRef.current) {
      setUser(null);
      setIsLoading(false);
    }

    try {
      await logoutSession();
    } finally {
      if (isMountedRef.current && mutationId === authMutationRef.current) {
        setUser(null);
        setIsLoading(false);
      }

      logoutInFlightRef.current = false;
    }
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, refreshSession, isLoading }),
    [user, login, logout, refreshSession, isLoading]
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
