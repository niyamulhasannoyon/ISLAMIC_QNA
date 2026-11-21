import React from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';
import { BengaliText } from '../../src/components/BengaliText';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const isBn = settings.language === 'bn';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BengaliText size={22} weight="700" style={styles.title}>
          {isBn ? 'গোপনীয়তা নীতি (Privacy Policy)' : 'Privacy Policy'}
        </BengaliText>
        <BengaliText size={13} color={colors.textMuted} style={styles.date}>
          {isBn ? 'সর্বশেষ হালনাগাদ: নভেম্বর ২০২৬' : 'Last Updated: November 2026'}
        </BengaliText>

        <View style={styles.paragraphBox}>
          <BengaliText size={16} weight="600" style={styles.subheading}>
            {isBn ? '১. কোনো ব্যক্তিগত তথ্য সংগ্রহ নয়' : '1. Zero Personal Data Collection'}
          </BengaliText>
          <BengaliText size={15} color={colors.textSecondary} style={styles.bodyText}>
            {isBn
              ? 'দীন কিউএনএ (DeenQnA) একটি উন্মুক্ত জ্ঞানভাণ্ডার। এই অ্যাপ ব্যবহারে কোনো অ্যাকাউন্ট খোলা বা লগইন করার প্রয়োজন নেই। আমরা আপনার নাম, ইমেইল, ফোন নম্বর বা অবস্থান সংক্রান্ত কোনো ব্যক্তিগত তথ্য (PII) ট্র্যাক বা সংগ্রহ করি না।'
              : 'DeenQnA is an open educational repository. No accounts or logins are required to use this app. We do not track or collect any personally identifiable information (PII) such as name, email, phone number, or geolocation.'}
          </BengaliText>
        </View>

        <View style={styles.paragraphBox}>
          <BengaliText size={16} weight="600" style={styles.subheading}>
            {isBn ? '২. লোকাল-ফার্স্ট ও অফলাইন স্টোরেজ' : '2. Local-First & Offline Storage'}
          </BengaliText>
          <BengaliText size={15} color={colors.textSecondary} style={styles.bodyText}>
            {isBn
              ? 'আপনার সাম্প্রতিক অনুসন্ধান, সংকলন এবং বুকমার্ক সম্পূর্ণ আপনার ডিভাইসের নিজস্ব মেমোরিতে (SQLite / SecureStore) সংরক্ষিত থাকে। এই তথ্য আমাদের সার্ভারে পাঠানো হয় না এবং আপনি যেকোনো সময় সেটিংস থেকে এগুলো মুছে ফেলতে পারেন।'
              : 'Your recent searches, collections, and bookmarks are stored exclusively on your device (SQLite / SecureStore). This data is never sent to our servers and can be wiped at any time in Settings.'}
          </BengaliText>
        </View>

        <View style={styles.paragraphBox}>
          <BengaliText size={16} weight="600" style={styles.subheading}>
            {isBn ? '৩. টেলিমেট্রি ও অপ্ট-আউট' : '3. Telemetry & Opt-Out'}
          </BengaliText>
          <BengaliText size={15} color={colors.textSecondary} style={styles.bodyText}>
            {isBn
              ? 'অ্যাপের ক্র্যাশ এবং পারফরম্যান্স পর্যবেক্ষণের জন্য আমরা বেনামী কারিগরি লগ (Sentry) ব্যবহার করি। আপনি সেটিংস মেনু থেকে যেকোনো সময় এই টেলিমেট্রি বন্ধ (Opt-out) করতে পারেন।'
              : 'We use anonymous technical crash diagnostics (Sentry) to maintain app reliability. You can completely opt-out of telemetry at any time in the Settings menu.'}
          </BengaliText>
        </View>

        <View style={styles.paragraphBox}>
          <BengaliText size={16} weight="600" style={styles.subheading}>
            {isBn ? '৪. কোনো বিজ্ঞাপন বা ট্র্যাকার নেই' : '4. No Ads or Third-Party Trackers'}
          </BengaliText>
          <BengaliText size={15} color={colors.textSecondary} style={styles.bodyText}>
            {isBn
              ? 'এই অ্যাপটিতে কোনো বাণিজ্যিক বিজ্ঞাপন, ব্যানার বা বিজ্ঞাপন ট্র্যাকিং নেটওয়ার্ক অন্তর্ভুক্ত নেই।'
              : 'This application contains zero third-party advertisements, banners, or advertising tracking SDKs.'}
          </BengaliText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  title: {
    marginBottom: 4,
  },
  date: {
    marginBottom: 20,
  },
  paragraphBox: {
    marginBottom: 20,
  },
  subheading: {
    marginBottom: 8,
  },
  bodyText: {
    lineHeight: 24,
  },
});
