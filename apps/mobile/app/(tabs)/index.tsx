import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../src/context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useDebounce } from '../../src/hooks/useDebounce';
import { SearchBar } from '../../src/components/SearchBar';
import { FilterChips } from '../../src/components/FilterChips';
import { FatwaCard } from '../../src/components/FatwaCard';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { SyncBadge } from '../../src/components/SyncBadge';
import { BengaliText } from '../../src/components/BengaliText';
import { executeSearch } from '../../src/services/api';
import { getDatabase } from '../../src/db/database';
import {
  getRecentSearches,
  addRecentSearch,
  deleteRecentSearch,
  clearRecentSearches,
} from '../../src/db/recentSearchesRepo';
import {
  isBookmarked,
  toggleBookmark,
} from '../../src/db/bookmarksRepo';
import type { LocalFatwa, RecentSearch } from '../../src/types';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; q?: string }>();
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { light } = useHaptics();

  const [query, setQuery] = useState(params.q || '');
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState(params.category || 'All');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const debouncedQuery = useDebounce(query, 250);

  // Sync category param if navigated from Categories tab
  useEffect(() => {
    if (params.category) {
      setSelectedCategory(params.category);
    }
  }, [params.category]);

  // Load recent searches
  const loadRecentSearches = async () => {
    try {
      const db = await getDatabase();
      const recents = await getRecentSearches(db);
      setRecentSearches(recents);
    } catch {}
  };

  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Search query via TanStack Query
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ results: LocalFatwa[]; total: number; isOfflineResult: boolean; intent?: any }>({
    queryKey: ['fatwa-search', debouncedQuery, selectedSource, selectedCategory],
    queryFn: async () => {
      const res = await executeSearch(debouncedQuery, {
        source: selectedSource,
        category: selectedCategory,
        limit: 25,
      });

      // Save non-empty query to local recent searches
      if (debouncedQuery.trim().length >= 2) {
        getDatabase().then((db) => {
          addRecentSearch(db, debouncedQuery.trim()).then(loadRecentSearches);
        });
      }

      // Check bookmark status for results
      const db = await getDatabase();
      const bmSet = new Set<string>();
      for (const item of res.results) {
        const bookmarked = await isBookmarked(db, item.id);
        if (bookmarked) bmSet.add(item.id);
      }
      setBookmarkedIds(bmSet);

      return res;
    },
  });

  const handleToggleBookmark = async (fatwa: LocalFatwa) => {
    const db = await getDatabase();
    const isNowBookmarked = await toggleBookmark(db, fatwa.id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isNowBookmarked) next.add(fatwa.id);
      else next.delete(fatwa.id);
      return next;
    });
  };

  const handleRecentClick = (recentText: string) => {
    light();
    setQuery(recentText);
    Keyboard.dismiss();
  };

  const handleClearRecents = async () => {
    const db = await getDatabase();
    await clearRecentSearches(db);
    setRecentSearches([]);
  };

  const sourceOptions = [
    { id: 'All', label: 'সব উৎস' },
    { id: 'al-itisam', label: 'আল-ইতিসাম' },
    { id: 'at-tahreek', label: 'আত-তাহরীক' },
    { id: 'al-kawsar', label: 'আল-কাউসার' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <View>
            <BengaliText size={20} weight="700" color={colors.primary}>
              দ্বীন জিজ্ঞাসা (DeenQnA)
            </BengaliText>
            <BengaliText size={12} color={colors.textMuted}>
              প্রামাণ্য ফতোয়া ও ইসলামিক সমাধান
            </BengaliText>
          </View>
          <SyncBadge />
        </View>

        <View style={styles.searchRow}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            isLoading={isLoading && debouncedQuery.length > 0}
            onClear={() => setQuery('')}
          />
        </View>

        {/* Source Filter Chips */}
        <FilterChips
          options={sourceOptions}
          selectedId={selectedSource}
          onSelect={setSelectedSource}
        />
      </View>

      {/* Selected Category Pill if active */}
      {selectedCategory !== 'All' ? (
        <View style={[styles.activeFilterBar, { backgroundColor: colors.surfaceSubtle }]}>
          <Text style={[styles.activeFilterLabel, { color: colors.textSecondary }]}>
            বিষয়: {selectedCategory}
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedCategory('All')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Results List / State Views */}
      {isLoading ? (
        <SkeletonLoader count={4} />
      ) : isError ? (
        <ErrorState
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      ) : (
        <FlatList
          data={data?.results || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            query.length === 0 && recentSearches.length > 0 ? (
              <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                  <BengaliText size={13} weight="600" color={colors.textMuted}>
                    সাম্প্রতিক অনুসন্ধান
                  </BengaliText>
                  <TouchableOpacity onPress={handleClearRecents}>
                    <BengaliText size={12} color={colors.primary}>
                      মুছে ফেলুন
                    </BengaliText>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentPills}>
                  {recentSearches.map((rec) => (
                    <TouchableOpacity
                      key={rec.id}
                      onPress={() => handleRecentClick(rec.query)}
                      style={[
                        styles.recentPill,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                      <BengaliText size={13} color={colors.textSecondary}>
                        {rec.query}
                      </BengaliText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                icon="document-text-outline"
                title={
                  query.trim().length > 0
                    ? 'কোন ফলাফল পাওয়া যায়নি'
                    : 'ফতোয়া অনুসন্ধান করুন'
                }
                description={
                  query.trim().length > 0
                    ? 'বানান পরিবর্তন করে অথবা অন্য শব্দ লিখে চেষ্টা করুন।'
                    : 'সালাত, সিয়াম, তাহারাত বা যেকোনো ধর্মীয় বিধান অনুসন্ধান করুন।'
                }
              />
            ) : null
          }
          renderItem={({ item }) => (
            <FatwaCard
              fatwa={item}
              isBookmarked={bookmarkedIds.has(item.id)}
              onToggleBookmark={() => handleToggleBookmark(item)}
              onPress={() => {
                light();
                router.push({
                  pathname: '/fatwa/[id]',
                  params: { id: item.id },
                });
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  activeFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  activeFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  recentSection: {
    marginBottom: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});
