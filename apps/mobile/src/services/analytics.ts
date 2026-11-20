import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const OPT_OUT_KEY = 'deenqna_analytics_opt_out';
let isOptedOutCache: boolean | null = null;

export async function isAnalyticsOptedOut(): Promise<boolean> {
  if (isOptedOutCache !== null) return isOptedOutCache;
  try {
    const val = await SecureStore.getItemAsync(OPT_OUT_KEY);
    isOptedOutCache = val === 'true';
  } catch {
    isOptedOutCache = false;
  }
  return isOptedOutCache;
}

export async function setAnalyticsOptOut(optOut: boolean): Promise<void> {
  isOptedOutCache = optOut;
  try {
    await SecureStore.setItemAsync(OPT_OUT_KEY, optOut ? 'true' : 'false');
  } catch {}
}

/**
 * Privacy-preserving event tracker (No PII, No device fingerprinting, respects opt-out)
 */
export async function trackAppEvent(
  eventType: string,
  eventData: Record<string, string | number | boolean> = {}
): Promise<void> {
  const optedOut = await isAnalyticsOptedOut();
  if (optedOut) return;

  const baseUrl =
    Constants.expoConfig?.extra?.apiUrl ||
    process.env.EXPO_PUBLIC_API_URL ||
    'https://deenqna.vercel.app';

  try {
    await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        eventData: {
          ...eventData,
          platform: 'mobile',
          appVersion: Constants.expoConfig?.version || '1.0.0',
        },
      }),
    });
  } catch {
    // Non-blocking telemetry failure is silenced
  }
}
