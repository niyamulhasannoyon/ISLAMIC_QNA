import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = process.env.APP_ENV || process.env.EXPO_PUBLIC_APP_ENV || 'production';
  const owner = process.env.APP_BUNDLE_OWNER || process.env.EXPO_PUBLIC_OWNER || 'niyamul';

  const getBundleId = () => {
    const base = `com.${owner}.deenqna`;
    if (appEnv === 'development') return `${base}.dev`;
    if (appEnv === 'preview') return `${base}.preview`;
    return base;
  };

  const getAppName = () => {
    if (appEnv === 'development') return 'DeenQnA (Dev)';
    if (appEnv === 'preview') return 'DeenQnA (Preview)';
    return 'DeenQnA - ফতোয়া অনুসন্ধান';
  };

  const bundleIdentifier = getBundleId();

  return {
    ...config,
    name: getAppName(),
    slug: 'deenqna-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'deenqna',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#064E3B',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier,
      buildNumber: '1',
      associatedDomains: [
        'applinks:deenqna.vercel.app',
        'applinks:www.deenqna.vercel.app',
      ],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#064E3B',
      },
      package: bundleIdentifier,
      versionCode: 1,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'deenqna.vercel.app',
              pathPrefix: '/fatwa',
            },
            {
              scheme: 'https',
              host: 'deenqna.vercel.app',
              pathPrefix: '/search',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      bundler: 'metro',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-sqlite',
      'expo-secure-store',
      'expo-font',
    ],
    extra: {
      appEnv,
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://deenqna.vercel.app',
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
      eas: {
        projectId: process.env.EAS_PROJECT_ID || 'your-expo-project-id',
      },
    },
  };
};
