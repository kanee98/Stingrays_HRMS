'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

interface User {
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Same host + port for localhost; subdomain URL (no port) when on subdomain */
function appUrl(port: number) {
  if (typeof window === 'undefined') return `http://localhost:${port}`;
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

function getBaseDomain(): string | null {
  if (typeof window === 'undefined' || window.location.hostname === 'localhost') return null;
  const parts = window.location.hostname.split('.');
  return parts.length >= 2 ? parts.slice(-2).join('.') : null;
}

/** HRMS URL for logout chain */
function getHrmsUrl(): string {
  const base = getBaseDomain();
  if (base) return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//hrms.${base}`;
  return appUrl(3000);
}

/** Payroll URL for logout chain */
function getPayrollUrl(): string {
  const base = getBaseDomain();
  if (base) return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//payroll.${base}`;
  return appUrl(3010);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let skipSetLoadingFalse = false;
    try {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('logout') === '1') {
        // Clear storage and redirect only — do NOT setState so ProtectedRoute never re-renders with user=null
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        document.cookie = 'auth_token=; path=/; max-age=0';
        skipSetLoadingFalse = true;
        // chain=1 means we came from 3010 (user logged out from Payroll) → go to 3000 to finish chain
        if (params.get('chain') === '1') {
          window.location.replace(`${getHrmsUrl()}?logout=1&chain=1`);
        } else {
          // User logged out from 3001 → go to 3010 next
          window.location.replace(`${getPayrollUrl()}?logout=1`);
        }
        return;
      }

      if (window.location.hash) {
        const hash = window.location.hash.slice(1);
        const hashParams = new URLSearchParams(hash);
        const tokenFromUrl = hashParams.get('token');
        const userFromUrl = hashParams.get('user');
        if (tokenFromUrl && userFromUrl) {
          try {
            const userObj = JSON.parse(decodeURIComponent(userFromUrl));
            setToken(tokenFromUrl);
            setUser(userObj);
            localStorage.setItem('auth_token', tokenFromUrl);
            localStorage.setItem('auth_user', decodeURIComponent(userFromUrl));
            document.cookie = `auth_token=${tokenFromUrl}; path=/; max-age=28800`;
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          } catch {
            // invalid hash, fall through
          }
          setIsLoading(false);
          return;
        }
      }

      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          document.cookie = `auth_token=${storedToken}; path=/; max-age=28800`;
        } catch {
          // ignore
        }
      }
    } finally {
      if (!skipSetLoadingFalse) setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (_email: string, _password: string) => {
    throw new Error('Please log in via the main HRMS app.');
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    document.cookie = 'auth_token=; path=/; max-age=0';
  }, []);

  const value = useMemo(
    () => ({ user, token, login, logout, isLoading }),
    [user, token, login, logout, isLoading]
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
