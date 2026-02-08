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

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:4001';
const EMPLOYEE_UI_URL = process.env.NEXT_PUBLIC_EMPLOYEE_UI_URL || 'http://localhost:3001';

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
      // Logout chain: clear this app, then pass ?logout=1 to next app so all services clear session
      const params = new URLSearchParams(window.location.search);
      if (params.get('logout') === '1') {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        document.cookie = 'auth_token=; path=/; max-age=0';
        window.history.replaceState(null, '', window.location.pathname);
        // Chain: HRMS → Employee → Payroll → HRMS login
        window.location.href = `${EMPLOYEE_UI_URL}?logout=1`;
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
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/login`, {
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
