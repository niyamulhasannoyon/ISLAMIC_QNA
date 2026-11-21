import React from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';
import { BengaliText } from '../../src/components/BengaliText';

export default function TermsAndDisclaimerScreen() {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const isBn = settings.language === 'bn';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BengaliText size={22} weight="700" style={styles.title}>
          {isBn ? 'ব্যবহারের শর্তাবলী ও দ্বীনি সতর্কবার্তা' : 'Terms & Religious Disclaimer'}
        </BengaliText>
        <BengaliText size={13} color={colors.textMuted} style={styles.date}>
          {isBn ? 'সর্বশেষ হালনাগাদ: নভেম্বর ২০২৬' : 'Last Updated: November 2026'}
        </BengaliText>

        <View style={styles.paragraphBox}>
          <BengaliText size={16} weight="600" style={styles.subheading}>
            {isBn ? '১. ফতোয়ার উৎস ও তথ্যসূত্র' : '1. Sources & Attribution'}
          </BengaliText>
          <BengaliText size={15} color={colors.textSecondary} style={styles.bodyText}>
            {isBn
              ? 'দীন কিউএনএ-তে প্রদর্শিত ফতোয়াসমূহ সুপরিচিত ও নির্ভরযোগ্য ইসলামিক সাময়িকী ও গবেষক প্রতিষ্ঠান (যেমন: মাসিক আত-তাহরীক, মাসিক আল-কাউসার, ফাতাওয়া আল-ইতিসাম) থেকে সরাসরি সূত্রসহ সংকলিত। প্রতিটি ফতোয়ায় মূল প্রকাশনার স্পষ্ট উল্লেখ রয়েছে।'
              : 'Fatwas displayed in DeenQnA are aggregated directly from established Islamic scholarly sources (e.g., Monthly At-Tahreek, Monthly Al-Kawsar, Fatwa Al-Itisam) with full attribution and direct links.'}
          </BengaliText>
        </View>

        <View style={styles.paragraphBox}>
          <BengaliText size={16} weight="600" style={styles.subheading}>
            {isBn ? '২. দ্বীনি পরামর্শ ও জরুরি সতর্কতা' : '2. Scholarly Consultation Notice'}
          </BengaliText>
          <BengaliText size={15} color={colors.textSecondary} style={styles.bodyText}>
            {isBn
              ? 'এই অ্যাপটি সাধারণ দ্বীনি জ্ঞান ও অনুসন্ধানের সুবিধার্থে প্রস্তুত করা হয়েছে। পারিবারিক বিবাদ, জটিল অর্থনৈতিক লেনদেন বা আদালতের মতো স্পর্শকাতর বিষয়ে কোনো চূড়ান্ত সিদ্ধান্ত নেওয়ার আগে অনুগ্রহ করে সরাসরি অভিজ্ঞ স্থানীয় মুফতী ও আলেমে দ্বীনের সাথে পরামর্শ করুন।'
              : 'This app is designed for educational and informational reference. For critical personal matters such as inheritance, divorce, or legal disputes, users should consult with qualified local scholars or Muftis directly.'}
          </BengaliText>
        </View>

        <View style={styles.paragraphBox}>
          <BengaliText size={16} weight="600" style={styles.subheading}>
            {isBn ? '৩. উন্মুক্ত ও অবাণিজ্যিক ব্যবহার' : '3. Non-Commercial Educational Purpose'}
          </BengaliText>
          <BengaliText size={15} color={colors.textSecondary} style={styles.bodyText}>
            {isBn
              ? 'দীন কিউএনএ সম্পূর্ণ অলাভজনক ও উন্মুক্ত সেবামূলক উদ্যোগ। এখানে কোনো বিজ্ঞাপন নেই এবং কোনো বাণিজ্যিক উদ্দেশ্যে ফতোয়াগুলো ব্যবহার করা হয় না।'
              : 'DeenQnA is an open-source, non-profit community initiative dedicated to knowledge dissemination without monetization or advertising.'}
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
