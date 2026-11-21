import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';
import { useHaptics } from '../../src/hooks/useHaptics';
import { BengaliText } from '../../src/components/BengaliText';
import { getDatabase } from '../../src/db/database';
import { getLocalCategories } from '../../src/db/fatwaRepo';
import type { CategorySummary } from '../../src/types';

interface DisplayCategory {
  name: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const DEFAULT_CATEGORIES: DisplayCategory[] = [
  { name: 'ঈমান ও আকীদা', count: 0, icon: 'shield-checkmark-outline', color: '#0284C7' },
  { name: 'পবিত্রতা ও ওযূ', count: 0, icon: 'water-outline', color: '#0D9488' },
  { name: 'সালাত ও নামায', count: 0, icon: 'time-outline', color: '#059669' },
  { name: 'যাকাত ও সাদাকাহ', count: 0, icon: 'cash-outline', color: '#D97706' },
  { name: 'সিয়াম ও রোযা', count: 0, icon: 'moon-outline', color: '#7C3AED' },
  { name: 'হজ্জ ও উমরাহ', count: 0, icon: 'navigate-circle-outline', color: '#EA580C' },
  { name: 'বিবাহ ও তালাক', count: 0, icon: 'people-outline', color: '#DB2777' },
  { name: 'লেনদেন ও ক্রয়-বিক্রয়', count: 0, icon: 'receipt-outline', color: '#4F46E5' },
  { name: 'হালাল ও হারাম', count: 0, icon: 'alert-circle-outline', color: '#DC2626' },
  { name: 'কুরআন ও তাফসীর', count: 0, icon: 'book-outline', color: '#16A34A' },
  { name: 'হাদীস ও সুন্নাহ', count: 0, icon: 'library-outline', color: '#2563EB' },
  { name: 'দোয়া ও যিকির', count: 0, icon: 'heart-outline', color: '#9333EA' },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { light } = useHaptics();

  const [categories, setCategories] = useState<DisplayCategory[]>(DEFAULT_CATEGORIES);
  const [searchFilter, setSearchFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCategories = async () => {
    try {
      const db = await getDatabase();
      const localSummaries = await getLocalCategories(db);

      if (localSummaries && localSummaries.length > 0) {
        // Map local db counts to our category list and include any discovered categories
        const iconMap: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
          'ঈমান ও আকীদা': { icon: 'shield-checkmark-outline', color: '#0284C7' },
          'পবিত্রতা ও ওযূ': { icon: 'water-outline', color: '#0D9488' },
          'সালাত ও নামায': { icon: 'time-outline', color: '#059669' },
          'যাকাত ও সাদাকাহ': { icon: 'cash-outline', color: '#D97706' },
          'সিয়াম ও রোযা': { icon: 'moon-outline', color: '#7C3AED' },
          'হজ্জ ও উমরাহ': { icon: 'navigate-circle-outline', color: '#EA580C' },
          'বিবাহ ও তালাক': { icon: 'people-outline', color: '#DB2777' },
          'লেনদেন ও ক্রয়-বিক্রয়': { icon: 'receipt-outline', color: '#4F46E5' },
          'হালাল ও হারাম': { icon: 'alert-circle-outline', color: '#DC2626' },
          'কুরআন ও তাফসীর': { icon: 'book-outline', color: '#16A34A' },
          'হাদীস ও সুন্নাহ': { icon: 'library-outline', color: '#2563EB' },
          'দোয়া ও যিকির': { icon: 'heart-outline', color: '#9333EA' },
        };

        const merged: DisplayCategory[] = localSummaries.map((cat, idx) => {
          const conf = iconMap[cat.name] || {
            icon: 'folder-outline' as keyof typeof Ionicons.glyphMap,
            color: ['#059669', '#2563EB', '#7C3AED', '#D97706', '#0D9488'][idx % 5],
          };
          return {
            name: cat.name,
            count: cat.count,
            icon: conf.icon,
            color: conf.color,
          };
        });

        setCategories(merged);
      }
    } catch (err) {
      console.warn('Failed to load local categories:', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadCategories();
    setIsRefreshing(false);
  };

  const filteredCategories = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchFilter]);

  const handleCategoryPress = (categoryName: string) => {
    light();
    router.push({
      pathname: '/(tabs)',
      params: { category: categoryName },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Category search filter */}
      <View style={[styles.filterBarContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.filterInputWrap, { backgroundColor: colors.surfaceSubtle }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.filterInput, { color: colors.text }]}
            placeholder={settings.language === 'bn' ? 'বিষয় অনুসন্ধান করুন...' : 'Filter categories...'}
            placeholderTextColor={colors.textMuted}
            value={searchFilter}
            onChangeText={setSearchFilter}
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
          {searchFilter.length > 0 && (
            <TouchableOpacity onPress={() => setSearchFilter('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.cardShadow,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => handleCategoryPress(item.name)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.count} টি ফতোয়া`}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>

            <View style={styles.textWrap}>
              <BengaliText size={16} weight="600" color={colors.text}>
                {item.name}
              </BengaliText>
              {item.count > 0 && (
                <BengaliText size={12} weight="400" color={colors.textMuted} style={styles.countText}>
                  {settings.language === 'bn' ? `${item.count} টি ফতোয়া সংরক্ষিত` : `${item.count} fatwas`}
                </BengaliText>
              )}
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
            <BengaliText size={15} color={colors.textMuted} style={styles.emptyText}>
              {settings.language === 'bn' ? 'কোন বিষয় পাওয়া যায়নি' : 'No categories found'}
            </BengaliText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  filterInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  countText: {
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
  },
});
