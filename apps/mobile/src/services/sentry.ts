import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export function initSentry() {
  const dsn =
    Constants.expoConfig?.extra?.sentryDsn ||
    process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    // Sentry disabled if no DSN provided
    return;
  }

  Sentry.init({
    dsn,
    debug: __DEV__,
    enableAutoSessionTracking: true,
    // Disable capturing PII (IP, device usernames)
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
  });
}

export function captureException(error: unknown, context?: Record<string, any>) {
  if (__DEV__) {
    console.error('[Error Captured]:', error, context);
  }
  Sentry.captureException(error, { extra: context });
}
