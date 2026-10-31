import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserProfile, LoginRequest, RegisterRequest } from '@personal-ai-assistant/shared';
import { apiClient, ApiError } from '../lib/api-client';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  googleSignIn: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await apiClient.auth.me();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (data: LoginRequest) => {
    const res = await apiClient.auth.login(data);
    setUser(res.user);
  };

  const register = async (data: RegisterRequest) => {
    const res = await apiClient.auth.register(data);
    setUser(res.user);
  };

  const googleSignIn = async (idToken: string) => {
    const res = await apiClient.auth.google(idToken);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await apiClient.auth.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        googleSignIn,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
