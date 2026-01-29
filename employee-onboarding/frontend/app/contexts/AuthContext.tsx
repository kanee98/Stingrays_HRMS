'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

const HRMS_URL = process.env.NEXT_PUBLIC_HRMS_URL || 'http://localhost:3000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    // Sync logout from HRMS: when user logs out on 3000, they are sent here with ?logout=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('logout') === '1') {
      setToken(null);
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      document.cookie = 'auth_token=; path=/; max-age=0';
      window.history.replaceState(null, '', window.location.pathname);
      window.location.href = `${HRMS_URL}/login`;
      return;
    }

    // Check for token passed from HRMS login (single sign-on redirect)
    if (window.location.hash) {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const tokenFromUrl = params.get('token');
      const userFromUrl = params.get('user');
      if (tokenFromUrl && userFromUrl) {
        try {
          const userObj = JSON.parse(decodeURIComponent(userFromUrl));
          setToken(tokenFromUrl);
          setUser(userObj);
          localStorage.setItem('auth_token', tokenFromUrl);
          localStorage.setItem('auth_user', decodeURIComponent(userFromUrl));
          document.cookie = `auth_token=${tokenFromUrl}; path=/; max-age=28800`;
          // Remove token from URL without reload
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch {
          // Ignore invalid hash
        }
        setIsLoading(false);
        return;
      }
    }

    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      document.cookie = `auth_token=${storedToken}; path=/; max-age=28800`;
    }
    setIsLoading(false);
  }, []);

  // Employee UI uses single sign-on via HRMS; login is only used if we add a fallback
  const login = async (_email: string, _password: string) => {
    throw new Error('Please log in via the main HRMS app.');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    document.cookie = 'auth_token=; path=/; max-age=0';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
