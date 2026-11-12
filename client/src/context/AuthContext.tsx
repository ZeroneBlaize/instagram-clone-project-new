import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/apiClient';
import { PublicUser } from '../types';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: { username: string; displayName: string; email: string; password: string }) => Promise<void>;
  demoLogin: (username?: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  updateProfile: (patch: { displayName?: string; bio?: string; website?: string; avatarUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ user: PublicUser }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = async (identifier: string, password: string) => {
    const res = await apiRequest<{ token: string; user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setStoredToken(res.token);
    setUser(res.user);
  };

  const register = async (data: {
    username: string;
    displayName: string;
    email: string;
    password: string;
  }) => {
    const res = await apiRequest<{ token: string; user: PublicUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    setUser(res.user);
  };

  const demoLogin = async (username = 'alex_rivera') => {
    const res = await apiRequest<{ token: string; user: PublicUser }>('/api/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    setStoredToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  const updateProfile = async (patch: {
    displayName?: string;
    bio?: string;
    website?: string;
    avatarUrl?: string;
  }) => {
    const res = await apiRequest<{ user: PublicUser }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, demoLogin, logout, refreshMe, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
