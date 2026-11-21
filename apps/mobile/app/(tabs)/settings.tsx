import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useTheme } from '../../src/context/ThemeContext';
import { useSettings, fontScaleMap } from '../../src/context/SettingsContext';
import { useSync } from '../../src/context/SyncContext';
import { useHaptics } from '../../src/hooks/useHaptics';
import { BengaliText } from '../../src/components/BengaliText';
import { getDatabase } from '../../src/db/database';
import { getLocalFatwaCount } from '../../src/db/fatwaRepo';
import type { AppTheme, FontSize, Language } from '../../src/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, colors, setTheme } = useTheme();
  const { settings, setFontSize, setLanguage, toggleAnalyticsOptOut, clearLocalData } = useSettings();
  const { progress, triggerSync } = useSync();
  const { light, medium, heavy } = useHaptics();

  const [localFatwaCount, setLocalFatwaCount] = useState<number>(0);

  const isBn = settings.language === 'bn';

  const refreshCount = async () => {
    try {
      const db = await getDatabase();
      const count = await getLocalFatwaCount(db);
      setLocalFatwaCount(count);
    } catch {}
  };

  useEffect(() => {
    refreshCount();
  }, [progress.totalSyncedCount]);

  const handleClearData = () => {
    Alert.alert(
      isBn ? 'স্থানীয় ডেটা মুছে ফেলুন' : 'Clear Local Data',
      isBn
        ? 'আপনি কি নিশ্চিত যে সকল সাম্প্রতিক অনুসন্ধান, বুকমার্ক এবং ক্যাশ ডেটা মুছে ফেলতে চান? এটি পুনরায় ফিরিয়ে আনা সম্ভব নয়।'
        : 'Are you sure you want to delete all recent searches, bookmarks, and cached offline data? This action cannot be undone.',
      [
        { text: isBn ? 'বাতিল' : 'Cancel', style: 'cancel' },
        {
          text: isBn ? 'মুছে ফেলুন' : 'Clear All',
          style: 'destructive',
          onPress: async () => {
            heavy();
            await clearLocalData();
            await refreshCount();
            Alert.alert(
              isBn ? 'সম্পন্ন' : 'Success',
              isBn ? 'সকল স্থানীয় ডেটা সফলভাবে মুছে ফেলা হয়েছে।' : 'Local data cleared successfully.'
            );
          },
        },
      ]
    );
  };

  const handleManualSync = async () => {
    medium();
    await triggerSync();
    await refreshCount();
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return isBn ? 'কখনও সিঙ্ক হয়নি' : 'Never';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {isBn ? 'প্রদর্শন ও থিম' : 'APPEARANCE'}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Theme Picker */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
                <BengaliText size={15} weight="500" style={styles.rowLabel}>
                  {isBn ? 'থিম নির্বাচন' : 'Theme'}
                </BengaliText>
              </View>
              <View style={styles.segmentedControl}>
                {(['system', 'light', 'dark'] as AppTheme[]).map((t) => {
                  const isSelected = theme === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.segmentBtn,
                        isSelected && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => {
                        light();
                        setTheme(t);
                      }}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: isSelected ? '#FFFFFF' : colors.textMuted },
                        ]}
                      >
                        {t === 'system' ? (isBn ? 'সিস্টেম' : 'Auto') : t === 'light' ? (isBn ? 'লাইট' : 'Light') : (isBn ? 'ডার্ক' : 'Dark')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Language Picker */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="language-outline" size={20} color={colors.primary} />
                <BengaliText size={15} weight="500" style={styles.rowLabel}>
                  {isBn ? 'ভাষা' : 'Language'}
                </BengaliText>
              </View>
              <View style={styles.segmentedControl}>
                {(['bn', 'en'] as Language[]).map((lang) => {
                  const isSelected = settings.language === lang;
                  return (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        styles.segmentBtn,
                        isSelected && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => {
                        light();
                        setLanguage(lang);
                      }}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: isSelected ? '#FFFFFF' : colors.textMuted },
                        ]}
                      >
                        {lang === 'bn' ? 'বাংলা' : 'English'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Typography Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {isBn ? 'হরফের আকার (ফন্ট সাইজ)' : 'TYPOGRAPHY'}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.fontSizeOptions}>
              {(['small', 'medium', 'large', 'xl'] as FontSize[]).map((size) => {
                const isSelected = settings.fontSize === size;
                const labels: Record<FontSize, string> = {
                  small: isBn ? 'ছোট' : 'Small',
                  medium: isBn ? 'স্বাভাবিক' : 'Medium',
                  large: isBn ? 'বড়' : 'Large',
                  xl: isBn ? 'অতি বড়' : 'X-Large',
                };
                return (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.fontSizeChip,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      light();
                      setFontSize(size);
                    }}
                  >
                    <Text
                      style={[
                        styles.fontSizeChipText,
                        {
                          color: isSelected ? colors.primaryDark : colors.text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {labels[size]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Typography Preview Box */}
            <View style={[styles.previewBox, { backgroundColor: colors.surfaceSubtle }]}>
              <BengaliText size={15} weight="400">
                {isBn
                  ? 'পূর্বরূপ: যে ব্যক্তি জ্ঞান অর্জনের উদ্দেশ্যে কোনো পথ অবলম্বন করে, আল্লাহ তা‘আলা তার জন্য জান্নাতের পথ সহজ করে দেন।'
                  : 'Preview: Whoever takes a path upon which to obtain knowledge, Allah makes the path to Paradise easy for him.'}
              </BengaliText>
            </View>
          </View>
        </View>

        {/* Offline Sync Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {isBn ? 'অফলাইন ডেটা ও সিঙ্ক' : 'OFFLINE STORE & SYNC'}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.syncRow}>
              <View>
                <BengaliText size={15} weight="600">
                  {isBn ? 'অফলাইন ডাটাবেজ' : 'Offline Database'}
                </BengaliText>
                <BengaliText size={12} color={colors.textMuted} style={{ marginTop: 2 }}>
                  {isBn
                    ? `${localFatwaCount} টি ফতোয়া সংরক্ষিত • সর্বশেষ: ${formatLastSync(progress.lastSyncedAt)}`
                    : `${localFatwaCount} fatwas stored • Last: ${formatLastSync(progress.lastSyncedAt)}`}
                </BengaliText>
              </View>

              <TouchableOpacity
                style={[
                  styles.syncBtn,
                  {
                    backgroundColor: progress.state === 'syncing' ? colors.surfaceSubtle : colors.primaryLight,
                    borderColor: colors.primary,
                  },
                ]}
                disabled={progress.state === 'syncing'}
                onPress={handleManualSync}
              >
                <Ionicons
                  name={progress.state === 'syncing' ? 'sync' : 'cloud-download-outline'}
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.syncBtnText, { color: colors.primaryDark }]}>
                  {progress.state === 'syncing'
                    ? isBn
                      ? 'সিঙ্ক হচ্ছে...'
                      : 'Syncing...'
                    : isBn
                    ? 'এখনই সিঙ্ক'
                    : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            </View>

            {progress.error && (
              <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="warning-outline" size={16} color="#DC2626" />
                <Text style={styles.errorBannerText}>{progress.error}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Privacy & Telemetry Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {isBn ? 'গোপনীয়তা ও ডেটা' : 'PRIVACY & DATA'}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={[styles.rowLeft, { flex: 1, paddingRight: 12 }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <BengaliText size={15} weight="500">
                    {isBn ? 'টেলিমেট্রি অপ্ট-আউট' : 'Telemetry Opt-Out'}
                  </BengaliText>
                  <BengaliText size={12} color={colors.textMuted} style={{ marginTop: 2 }}>
                    {isBn
                      ? 'ক্র্যাশ রিপোর্ট ও পারফরম্যান্স মেট্রিক্স পাঠানো বন্ধ করুন (কোন ব্যক্তিগত তথ্য সংগ্রহ করা হয় না)'
                      : 'Disable anonymous crash telemetry & performance metrics'}
                  </BengaliText>
                </View>
              </View>
              <Switch
                value={settings.analyticsOptOut}
                onValueChange={() => {
                  light();
                  toggleAnalyticsOptOut();
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.row} onPress={handleClearData}>
              <View style={styles.rowLeft}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
                <BengaliText size={15} weight="500" color="#DC2626" style={styles.rowLabel}>
                  {isBn ? 'স্থানীয় ক্যাশ ও বুকমার্ক মুছে ফেলুন' : 'Clear All Local Data'}
                </BengaliText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal & About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {isBn ? 'সম্পর্কে ও আইনি তথ্য' : 'ABOUT & LEGAL'}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.row} onPress={() => router.push('/legal/privacy')}>
              <View style={styles.rowLeft}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                <BengaliText size={15} weight="500" style={styles.rowLabel}>
                  {isBn ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
                </BengaliText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.row} onPress={() => router.push('/legal/terms')}>
              <View style={styles.rowLeft}>
                <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
                <BengaliText size={15} weight="500" style={styles.rowLabel}>
                  {isBn ? 'ব্যবহারের শর্তাবলী ও সতর্কবার্তা' : 'Terms & Disclaimer'}
                </BengaliText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.row}
              onPress={() => Linking.openURL('https://github.com/niyamulhasan/deenqna')}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="logo-github" size={20} color={colors.textMuted} />
                <BengaliText size={15} weight="500" style={styles.rowLabel}>
                  {isBn ? 'উৎস কোড (GitHub)' : 'Open Source Repository'}
                </BengaliText>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            DeenQnA Mobile v1.0.0
          </Text>
          <Text style={[styles.footerSubText, { color: colors.textMuted }]}>
            {isBn
              ? 'বিশ্বস্ত উৎস: মাসিক আত-তাহরীক, মাসিক আল-কাউসার, ফাতাওয়া আল-ইতিসাম'
              : 'Trusted Sources: Monthly At-Tahreek, Monthly Al-Kawsar, Fatwa Al-Itisam'}
          </Text>
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
    padding: 16,
    paddingBottom: 48,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    marginLeft: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fontSizeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    gap: 8,
  },
  fontSizeChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  fontSizeChipText: {
    fontSize: 13,
  },
  previewBox: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 12,
    borderRadius: 8,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  syncBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 8,
    gap: 8,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 12,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 12,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerSubText: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
