'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getSession, loginWithPassword, logoutSession, type SuperAdminUser } from '../lib/authClient';

interface AuthContextType {
  user: SuperAdminUser | null;
  login: (email: string, password: string) => Promise<SuperAdminUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<SuperAdminUser | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(false);
  const authMutationRef = useRef(0);
  const refreshRequestRef = useRef(0);
  const logoutInFlightRef = useRef(false);

  const refreshSession = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (logoutInFlightRef.current) {
      return null;
    }

    const mutationId = authMutationRef.current;
    const refreshId = ++refreshRequestRef.current;
    if (!silent && mountedRef.current) {
      setIsLoading(true);
    }

    try {
      const nextUser = await getSession();
      if (
        mountedRef.current &&
        !logoutInFlightRef.current &&
        mutationId === authMutationRef.current &&
        refreshId === refreshRequestRef.current
      ) {
        setUser(nextUser);
      }
      return nextUser;
    } catch {
      if (
        mountedRef.current &&
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
        mountedRef.current &&
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

    mountedRef.current = true;
    void refreshSession();

    const revalidateSession = () => {
      if (document.visibilityState !== 'hidden') {
        void refreshSession({ silent: true });
      }
    };

    window.addEventListener('focus', revalidateSession);
    document.addEventListener('visibilitychange', revalidateSession);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('focus', revalidateSession);
      document.removeEventListener('visibilitychange', revalidateSession);
    };
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    const mutationId = ++authMutationRef.current;
    logoutInFlightRef.current = false;
    const nextUser = await loginWithPassword(email, password);
    if (mountedRef.current && mutationId === authMutationRef.current) {
      setUser(nextUser);
      setIsLoading(false);
    }
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    const mutationId = ++authMutationRef.current;
    logoutInFlightRef.current = true;

    if (mountedRef.current) {
      setUser(null);
      setIsLoading(false);
    }

    try {
      await logoutSession();
    } finally {
      if (mountedRef.current && mutationId === authMutationRef.current) {
        setUser(null);
        setIsLoading(false);
      }

      logoutInFlightRef.current = false;
    }
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, refreshSession, isLoading }),
    [user, login, logout, refreshSession, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
