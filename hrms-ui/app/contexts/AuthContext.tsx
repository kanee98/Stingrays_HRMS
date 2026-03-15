'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

interface User {
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ token: string; user: User }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Auth API URL: use subdomain (auth.DOMAIN) when on subdomain, else env or localhost */
function getAuthServiceUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const parts = window.location.hostname.split('.');
    if (parts.length >= 2) return `${window.location.protocol}//auth.${parts.slice(-2).join('.')}`;
  }
  return process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:4001';
}

/** Same host + port for localhost; subdomain URL (no port) when on subdomain */
function appUrl(port: number) {
  if (typeof window === 'undefined') return `http://localhost:${port}`;
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

/** Employee app URL for logout chain: subdomain (employee.DOMAIN) or same host:3001 */
function getEmployeeUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  const parts = window.location.hostname.split('.');
  if (parts.length >= 2) return `${window.location.protocol}//employee.${parts.slice(-2).join('.')}`;
  return appUrl(3001);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('logout') === '1') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        document.cookie = 'auth_token=; path=/; max-age=0';
        // chain=1 means we arrived from 3010 in the chain → end at login
        if (params.get('chain') === '1') {
          window.location.replace('/login');
          return;
        }
        // User clicked logout on 3000: start chain 3000 → 3001 → 3010 → 3000/login
        window.location.replace(`${getEmployeeUrl()}?logout=1`);
        return;
      }
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          document.cookie = `auth_token=${storedToken}; path=/; max-age=28800`;
        } catch {
          // ignore invalid stored data
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${getAuthServiceUrl()}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    // Set cookie for middleware (8 hours expiry)
    document.cookie = `auth_token=${data.token}; path=/; max-age=28800`;
    return { token: data.token, user: data.user };
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
