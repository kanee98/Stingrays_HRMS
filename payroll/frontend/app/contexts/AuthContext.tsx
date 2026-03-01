'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

interface User {
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Same host as current page, different port — works on localhost and server without build-time env */
function appUrl(port: number) {
  if (typeof window === 'undefined') return `http://localhost:${port}`;
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
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
        // Clear storage and redirect only — do NOT setState so PayrollLayout never re-renders with user=null
        // Chain from 3010: go to 3001 first so it gets cleared, then 3001 → 3000 → login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        document.cookie = 'auth_token=; path=/; max-age=0';
        skipSetLoadingFalse = true;
        window.location.replace(`${appUrl(3001)}?logout=1&chain=1`);
        return;
      }

      // 2) SSO: after HRMS login redirect, token and user come in URL hash
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
            // invalid hash, fall through to localStorage check
          }
          setIsLoading(false);
          return;
        }
      }

      // 3) Already logged in: read from localStorage (same keys as HRMS / Employee onboarding)
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          document.cookie = `auth_token=${storedToken}; path=/; max-age=28800`;
        } catch {
          setUser(null);
          setToken(null);
        }
      }
    } finally {
      if (!skipSetLoadingFalse) setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    document.cookie = 'auth_token=; path=/; max-age=0';
    // Stay on this app (3010)
    window.location.href = `${window.location.origin}/`;
  }, []);

  const value = useMemo(
    () => ({ user, token, logout, isLoading }),
    [user, token, logout, isLoading]
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
