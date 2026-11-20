import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getDatabase } from '../db/database';
import { clearRecentSearches } from '../db/recentSearchesRepo';
import { isAnalyticsOptedOut, setAnalyticsOptOut } from '../services/analytics';
import type { FontSize, Language, AppSettings } from '../types';

interface SettingsContextType {
  settings: AppSettings;
  fontScale: number;
  setFontSize: (size: FontSize) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  toggleAnalyticsOptOut: () => Promise<void>;
  clearLocalData: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  theme: 'system',
  fontSize: 'medium',
  language: 'bn',
  analyticsOptOut: false,
  offlineFirst: false,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  fontScale: 1.0,
  setFontSize: async () => {},
  setLanguage: async () => {},
  toggleAnalyticsOptOut: async () => {},
  clearLocalData: async () => {},
});

const FONT_KEY = 'deenqna_font_size';
const LANG_KEY = 'deenqna_lang';

export const fontScaleMap: Record<FontSize, number> = {
  small: 0.9,
  medium: 1.0,
  large: 1.18,
  xl: 1.35,
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    (async () => {
      try {
        const [savedFont, savedLang, optedOut] = await Promise.all([
          SecureStore.getItemAsync(FONT_KEY),
          SecureStore.getItemAsync(LANG_KEY),
          isAnalyticsOptedOut(),
        ]);

        setSettings((prev) => ({
          ...prev,
          fontSize: (savedFont as FontSize) || 'medium',
          language: (savedLang as Language) || 'bn',
          analyticsOptOut: optedOut,
        }));
      } catch {}
    })();
  }, []);

  const setFontSize = async (size: FontSize) => {
    setSettings((prev) => ({ ...prev, fontSize: size }));
    try {
      await SecureStore.setItemAsync(FONT_KEY, size);
    } catch {}
  };

  const setLanguage = async (lang: Language) => {
    setSettings((prev) => ({ ...prev, language: lang }));
    try {
      await SecureStore.setItemAsync(LANG_KEY, lang);
    } catch {}
  };

  const toggleAnalyticsOptOut = async () => {
    const nextVal = !settings.analyticsOptOut;
    setSettings((prev) => ({ ...prev, analyticsOptOut: nextVal }));
    await setAnalyticsOptOut(nextVal);
  };

  const clearLocalData = async () => {
    try {
      const db = await getDatabase();
      await clearRecentSearches(db);
      await db.runAsync(`DELETE FROM bookmarks`);
      await db.runAsync(`DELETE FROM collections WHERE id NOT LIKE 'col_%'`);
      // Reset sync metadata
      await db.runAsync(`DELETE FROM sync_metadata`);
    } catch (e) {
      console.error('Failed to clear local database:', e);
    }
  };

  const fontScale = fontScaleMap[settings.fontSize] || 1.0;

  return (
    <SettingsContext.Provider
      value={{
        settings,
        fontScale,
        setFontSize,
        setLanguage,
        toggleAnalyticsOptOut,
        clearLocalData,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  return useContext(SettingsContext);
}
