import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AppTheme } from '../types';

export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  markBg: string;
  markText: string;
  arabicColor: string;
  cardShadow: string;
}

const lightColors: ThemeColors = {
  isDark: false,
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  primary: '#059669',
  primaryLight: '#ECFDF5',
  primaryDark: '#047857',
  border: '#E2E8F0',
  badgeBg: '#E0F2FE',
  badgeText: '#0369A1',
  markBg: '#FEF08A',
  markText: '#854D0E',
  arabicColor: '#1E293B',
  cardShadow: 'rgba(0, 0, 0, 0.05)',
};

const darkColors: ThemeColors = {
  isDark: true,
  background: '#0B1120',
  surface: '#1E293B',
  surfaceSubtle: '#334155',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  primary: '#10B981',
  primaryLight: '#064E3B',
  primaryDark: '#059669',
  border: '#334155',
  badgeBg: '#1E3A8A',
  badgeText: '#93C5FD',
  markBg: '#854D0E',
  markText: '#FEF9C3',
  arabicColor: '#F1F5F9',
  cardShadow: 'rgba(0, 0, 0, 0.3)',
};

interface ThemeContextType {
  theme: AppTheme;
  colors: ThemeColors;
  setTheme: (theme: AppTheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  colors: lightColors,
  setTheme: async () => {},
});

const THEME_STORAGE_KEY = 'deenqna_theme_pref';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<AppTheme>('system');

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeState(saved);
        }
      } catch {}
    })();
  }, []);

  const setTheme = async (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newTheme);
    } catch {}
  };

  const isDark =
    theme === 'dark' || (theme === 'system' && systemScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}
