import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, type SessionData } from './api';

type Role = 'officer' | 'admin' | 'bidder' | 'vigilance';

interface AuthContextType {
  user: SessionData | null;
  role: Role;
  isLoading: boolean;
  error: string | null;
  login: (credentials: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getSession();
      setUser(res.data);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const login = async (credentials: Record<string, string>) => {
    setError(null);
    try {
      const res = await api.login(credentials);
      setUser(res.data);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  const role = (user?.role?.toLowerCase() as Role) || 'officer';

  return (
    <AuthContext.Provider value={{ user, role, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
