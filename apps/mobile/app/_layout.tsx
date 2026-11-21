import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { SettingsProvider } from '../src/context/SettingsContext';
import { SyncProvider } from '../src/context/SyncContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { initSentry } from '../src/services/sentry';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function RootNavigation() {
  const { colors, theme } = useTheme();

  return (
    <>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="fatwa/[id]"
          options={{
            title: 'ফতোয়া বিস্তারিত',
            headerBackTitle: 'পেছনে',
          }}
        />
        <Stack.Screen
          name="report/[id]"
          options={{
            presentation: 'modal',
            title: 'সমস্যা প্রতিবেদন',
          }}
        />
        <Stack.Screen
          name="legal/privacy"
          options={{
            presentation: 'modal',
            title: 'গোপনীয়তা নীতি',
          }}
        />
        <Stack.Screen
          name="legal/terms"
          options={{
            presentation: 'modal',
            title: 'ব্যবহারের শর্তাবলী',
          }}
        />
        <Stack.Screen name="+not-found" options={{ title: 'পাওয়া যায়নি' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initSentry();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SettingsProvider>
            <SyncProvider>
              <RootNavigation />
            </SyncProvider>
          </SettingsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
