import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { settings } = useSettings();

  const isBn = settings.language === 'bn';

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isBn ? 'অনুসন্ধান' : 'Search',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: isBn ? 'বিষয়সমূহ' : 'Categories',
          headerTitle: isBn ? 'ইসলামিক বিষয়সমূহ' : 'Islamic Categories',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: isBn ? 'সংরক্ষিত' : 'Bookmarks',
          headerTitle: isBn ? 'সংরক্ষিত ফতোয়াসমূহ' : 'Saved Bookmarks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: isBn ? 'সেটিংস' : 'Settings',
          headerTitle: isBn ? 'অ্যাপ্লিকেশন সেটিংস' : 'App Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
