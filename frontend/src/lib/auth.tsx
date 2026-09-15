import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, setDevRole, getDevRole, type SessionData } from './api';

type Role = 'officer' | 'admin' | 'bidder' | 'vigilance';

interface AuthContextType {
  user: SessionData | null;
  role: Role;
  isLoading: boolean;
  error: string | null;
  switchRole: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionData | null>(null);
  const [role, setRole] = useState<Role>(getDevRole());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getSession();
      setUser(res.data);
    } catch (err) {
      // In dev mode, create a mock user if backend isn't running
      setUser({
        id: '00000000-0000-4000-a000-000000000001',
        full_name: `Dev ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        role: role.toUpperCase(),
        csrf_token: 'dev-csrf-token',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [role]);

  const switchRole = (newRole: Role) => {
    setDevRole(newRole);
    setRole(newRole);
  };

  const logout = () => {
    setUser(null);
    setRole('officer');
    setDevRole('officer');
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, error, switchRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
