import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  surface: string;
  surfaceSubtle: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  card: string;
}

export const lightColors: ThemeColors = {
  primary: '#4F46E5', // Indigo-600
  primaryLight: '#EEF2FF', // Indigo-50
  primaryDark: '#3730A3', // Indigo-800
  background: '#F8FAFC', // Slate-50
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9', // Slate-100
  border: '#E2E8F0', // Slate-200
  text: '#0F172A', // Slate-900
  textSecondary: '#475569', // Slate-600
  textMuted: '#94A3B8', // Slate-400
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  card: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  primary: '#6366F1', // Indigo-500
  primaryLight: '#1E1B4B', // Indigo-950
  primaryDark: '#818CF8', // Indigo-400
  background: '#0B0F19', // Dark Slate
  surface: '#1E293B', // Slate-800
  surfaceSubtle: '#334155', // Slate-700
  border: '#334155', // Slate-700
  text: '#F8FAFC', // Slate-50
  textSecondary: '#CBD5E1', // Slate-300
  textMuted: '#64748B', // Slate-500
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  card: '#1E293B',
};

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setScheme: (scheme: 'light' | 'dark' | 'system') => void;
  themePreference: 'light' | 'dark' | 'system';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>('system');

  const isDark =
    themePreference === 'system' ? systemScheme === 'dark' : themePreference === 'dark';

  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = () => {
    setThemePreference((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setScheme = (scheme: 'light' | 'dark' | 'system') => {
    setThemePreference(scheme);
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setScheme, themePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
