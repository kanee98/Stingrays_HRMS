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

  const refreshSession = useCallback(async () => {
    try {
      const nextUser = await getSession();
      if (mountedRef.current) {
        setUser(nextUser);
      }
      return nextUser;
    } catch {
      if (mountedRef.current) {
        setUser(null);
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refreshSession();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    const nextUser = await loginWithPassword(email, password);
    if (mountedRef.current) {
      setUser(nextUser);
    }
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      if (mountedRef.current) {
        setUser(null);
      }
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
