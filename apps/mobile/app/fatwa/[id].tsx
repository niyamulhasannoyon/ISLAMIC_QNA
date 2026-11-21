import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Share,
  Alert,
  Text,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../src/context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';
import { useHaptics } from '../../src/hooks/useHaptics';
import { BengaliText } from '../../src/components/BengaliText';
import { ArabicText } from '../../src/components/ArabicText';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';
import { ErrorState } from '../../src/components/ErrorState';
import { CollectionModal } from '../../src/components/CollectionModal';
import { executeGetFatwaById } from '../../src/services/api';
import { getDatabase } from '../../src/db/database';
import {
  isBookmarked,
  toggleBookmark,
  getCollections,
  createCollection,
  updateBookmarkCollection,
} from '../../src/db/bookmarksRepo';
import type { LocalFatwa, Collection } from '../../src/types';

// Arabic character range check
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function containsArabic(text: string): boolean {
  return ARABIC_REGEX.test(text);
}

function isPredominantlyArabic(text: string): boolean {
  if (!text) return false;
  const arabicMatches = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
  if (!arabicMatches) return false;
  const cleanLen = text.replace(/\s+/g, '').length;
  return cleanLen > 0 && arabicMatches.length / cleanLen > 0.4;
}

export default function FatwaReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { settings, fontScale, setFontSize } = useSettings();
  const { light, medium } = useHaptics();

  const [bookmarked, setBookmarked] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Fetch Fatwa details (with offline SQLite fallback)
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['fatwa-detail', id],
    queryFn: () => executeGetFatwaById(id!),
    enabled: Boolean(id),
  });

  const fatwa = data?.fatwa;
  const isOffline = data?.isOfflineResult ?? false;

  // Check bookmark status
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const db = await getDatabase();
        const bm = await isBookmarked(db, id);
        setBookmarked(bm);
        const cols = await getCollections(db);
        setCollections(cols);
      } catch {}
    })();
  }, [id]);

  const handleToggleBookmark = async () => {
    if (!id) return;
    light();
    try {
      const db = await getDatabase();
      const newState = await toggleBookmark(db, id);
      setBookmarked(newState);
      if (newState) {
        // Prompt collection if user has collections
        const cols = await getCollections(db);
        setCollections(cols);
        if (cols.length > 0) {
          setCollectionModalVisible(true);
        }
      }
    } catch (e) {
      console.error('Bookmark toggle failed:', e);
    }
  };

  const handleShare = async () => {
    if (!fatwa) return;
    light();
    const deepLink = `https://deenqna.vercel.app/fatwa/${fatwa.id}`;
    const shareMessage = `${fatwa.title}\n\nউৎস: ${getSourceDisplay(fatwa.source)}\n\n${deepLink}`;

    try {
      await Share.share({
        message: shareMessage,
        url: deepLink,
        title: fatwa.title,
      });
    } catch (e) {
      console.error('Share failed:', e);
    }
  };

  const handleCopyDeepLink = async () => {
    if (!fatwa) return;
    light();
    const deepLink = `https://deenqna.vercel.app/fatwa/${fatwa.id}`;
    await Clipboard.setStringAsync(deepLink);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleOpenOriginal = () => {
    if (!fatwa?.source_url) return;
    light();
    Linking.openURL(fatwa.source_url).catch(() => {
      Alert.alert('Error', 'মূল লিঙ্কটি খোলা যায়নি');
    });
  };

  const getSourceDisplay = (source: string) => {
    if (source === 'at-tahreek') return 'মাসিক আত-তাহরীক';
    if (source === 'al-kawsar') return 'মাসিক আল-কাউসার';
    return 'ফাতাওয়া আল-ইতিসাম';
  };

  const cycleFontSize = () => {
    light();
    const sizes = ['small', 'medium', 'large', 'xl'] as const;
    const currentIndex = sizes.indexOf(settings.fontSize);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    setFontSize(nextSize);
  };

  // Render paragraphs with Arabic block detection
  const renderFormattedAnswer = (content: string) => {
    if (!content) return null;
    const paragraphs = content.split(/\n\s*\n/);

    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      // Check if the paragraph is an Arabic quote or verse
      if (isPredominantlyArabic(trimmed)) {
        return (
          <View
            key={index}
            style={[
              styles.arabicBlock,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.primary,
              },
            ]}
          >
            <ArabicText size={20} weight="400">
              {trimmed}
            </ArabicText>
          </View>
        );
      }

      return (
        <BengaliText
          key={index}
          size={16}
          weight="400"
          style={[styles.paragraphText, { color: colors.text }]}
        >
          {trimmed}
        </BengaliText>
      );
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: 20 }}>
          <SkeletonLoader count={2} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !fatwa) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          message="ফতোয়াটি লোড করা সম্ভব হয়নি বা পাওয়া যায়নি।"
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerRight: () => (
            <View style={styles.headerRightActions}>
              <TouchableOpacity onPress={cycleFontSize} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="text-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="share-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleBookmark} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={bookmarked ? colors.primary : colors.text}
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Offline & Copy feedback banners */}
        {isOffline && (
          <View style={[styles.banner, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.textMuted} />
            <BengaliText size={12} color={colors.textMuted} style={{ marginLeft: 6 }}>
              অফলাইন ক্যাশ থেকে প্রদর্শিত হচ্ছে
            </BengaliText>
          </View>
        )}

        {copyFeedback && (
          <View style={[styles.banner, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <BengaliText size={12} color={colors.primaryDark} style={{ marginLeft: 6 }}>
              লিঙ্ক ক্লিপবোর্ডে কপি করা হয়েছে
            </BengaliText>
          </View>
        )}

        {/* Source and Category Badges */}
        <View style={styles.metaRow}>
          <View style={[styles.sourceBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.sourceBadgeText, { color: colors.primaryDark }]}>
              {getSourceDisplay(fatwa.source)}
            </Text>
          </View>

          {fatwa.category ? (
            <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.categoryBadgeText, { color: colors.textMuted }]}>
                {fatwa.category}
              </Text>
            </View>
          ) : null}

          {fatwa.scholar ? (
            <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.categoryBadgeText, { color: colors.textMuted }]}>
                {fatwa.scholar}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Title */}
        <BengaliText size={20} weight="700" style={styles.title}>
          {fatwa.title}
        </BengaliText>

        {/* Question Block */}
        <View style={[styles.sectionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
            <BengaliText size={14} weight="700" color={colors.primary} style={{ marginLeft: 6 }}>
              প্রশ্ন:
            </BengaliText>
          </View>
          <BengaliText size={16} weight="500" style={styles.questionText}>
            {fatwa.question}
          </BengaliText>
        </View>

        {/* Answer Block */}
        <View style={[styles.sectionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-done-circle-outline" size={18} color={colors.primary} />
            <BengaliText size={14} weight="700" color={colors.primary} style={{ marginLeft: 6 }}>
              উত্তর:
            </BengaliText>
          </View>
          <View style={styles.answerBody}>
            {renderFormattedAnswer(fatwa.answer)}
          </View>
        </View>

        {/* Tags if available */}
        {fatwa.tags && fatwa.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            <Ionicons name="pricetags-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
            {fatwa.tags.map((tag, idx) => (
              <View key={idx} style={[styles.tagChip, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.tagText, { color: colors.textMuted }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions Footer */}
        <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleOpenOriginal}>
            <Ionicons name="open-outline" size={18} color={colors.primary} />
            <BengaliText size={14} weight="600" color={colors.primary} style={{ marginLeft: 6 }}>
              মূল ওয়েবসাইটে দেখুন
            </BengaliText>
          </TouchableOpacity>

          <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.actionBtn} onPress={handleCopyDeepLink}>
            <Ionicons name="copy-outline" size={18} color={colors.text} />
            <BengaliText size={14} weight="500" style={{ marginLeft: 6 }}>
              লিঙ্ক কপি
            </BengaliText>
          </TouchableOpacity>

          <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/report/${fatwa.id}`)}
          >
            <Ionicons name="flag-outline" size={18} color="#DC2626" />
            <BengaliText size={14} weight="500" color="#DC2626" style={{ marginLeft: 6 }}>
              ত্রুটি প্রতিবেদন
            </BengaliText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Collection assignment modal */}
      <CollectionModal
        visible={collectionModalVisible}
        collections={collections}
        selectedCollectionId={null}
        onSelectCollection={async (colId) => {
          const db = await getDatabase();
          await updateBookmarkCollection(db, fatwa.id, colId);
          setCollectionModalVisible(false);
        }}
        onCreateCollection={async (name) => {
          const db = await getDatabase();
          const newCol = await createCollection(db, name);
          await updateBookmarkCollection(db, fatwa.id, newCol.id);
          setCollectionModalVisible(false);
        }}
        onClose={() => setCollectionModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    marginBottom: 16,
    lineHeight: 30,
  },
  sectionBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionText: {
    lineHeight: 26,
  },
  answerBody: {
    gap: 12,
  },
  paragraphText: {
    marginBottom: 8,
  },
  arabicBlock: {
    padding: 14,
    borderRadius: 8,
    borderRightWidth: 4,
    marginVertical: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
  },
  actionCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
});
