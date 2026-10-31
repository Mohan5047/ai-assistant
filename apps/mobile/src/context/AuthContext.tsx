import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import type { UserProfile, LoginRequest, RegisterRequest } from '@personal-ai-assistant/shared';
import { apiClient } from '../lib/api-client';
import { authStorage } from '../lib/auth-storage';
import { registerForPushNotificationsAsync } from '../lib/notifications';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const registerDevicePushToken = async () => {
    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await apiClient.notifications.registerDevice({
          token: pushToken,
          platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        });
      }
    } catch (err) {
      console.warn('Failed to register device push token:', err);
    }
  };

  const checkAuthStatus = useCallback(async () => {
    try {
      const storedToken = await authStorage.getToken();
      if (storedToken) {
        setToken(storedToken);
        const res = await apiClient.auth.me();
        setUser(res.user);
        // Silently register device push token
        registerDevicePushToken().catch(() => {});
      }
    } catch (error) {
      // Token expired or invalid
      await authStorage.removeToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await apiClient.auth.login(credentials);
      await authStorage.setToken(response.token);
      setToken(response.token);
      setUser(response.user);
      registerDevicePushToken().catch(() => {});
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await apiClient.auth.register(data);
      await authStorage.setToken(response.token);
      setToken(response.token);
      setUser(response.user);
      registerDevicePushToken().catch(() => {});
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.auth.google(idToken);
      await authStorage.setToken(response.token);
      setToken(response.token);
      setUser(response.user);
      registerDevicePushToken().catch(() => {});
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.auth.logout().catch(() => {});
    } finally {
      await authStorage.removeToken();
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await apiClient.auth.me();
      setUser(res.user);
    } catch (error) {
      console.warn('Failed to refresh user profile:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
