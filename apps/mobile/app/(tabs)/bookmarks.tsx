import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';
import { useHaptics } from '../../src/hooks/useHaptics';
import { BengaliText } from '../../src/components/BengaliText';
import { FatwaCard } from '../../src/components/FatwaCard';
import { EmptyState } from '../../src/components/EmptyState';
import { CollectionModal } from '../../src/components/CollectionModal';
import { getDatabase } from '../../src/db/database';
import {
  getBookmarks,
  getCollections,
  createCollection,
  deleteCollection,
  toggleBookmark,
} from '../../src/db/bookmarksRepo';
import type { Bookmark, Collection } from '../../src/types';

export default function BookmarksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { light, heavy } = useHaptics();

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [fetchedCollections, fetchedBookmarks] = await Promise.all([
        getCollections(db),
        getBookmarks(db, selectedCollectionId),
      ]);
      setCollections(fetchedCollections);
      setBookmarks(fetchedBookmarks);
    } catch (err) {
      console.warn('Failed to load bookmarks:', err);
    }
  }, [selectedCollectionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleCreateCollection = async (name: string) => {
    try {
      const db = await getDatabase();
      await createCollection(db, name);
      await loadData();
    } catch (e) {
      console.error('Failed to create collection:', e);
    }
  };

  const handleDeleteCollection = (collection: Collection) => {
    Alert.alert(
      settings.language === 'bn' ? 'সংকলন মুছে ফেলুন' : 'Delete Collection',
      settings.language === 'bn'
        ? `আপনি কি নিশ্চিত যে "${collection.name}" সংকলনটি মুছে ফেলতে চান? সংরক্ষিত ফতোয়াগুলো সাধারণ বুকমার্কে থাকবে।`
        : `Are you sure you want to delete "${collection.name}"? Bookmarked fatwas will be retained.`,
      [
        { text: settings.language === 'bn' ? 'বাতিল' : 'Cancel', style: 'cancel' },
        {
          text: settings.language === 'bn' ? 'মুছে ফেলুন' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            heavy();
            const db = await getDatabase();
            await deleteCollection(db, collection.id);
            if (selectedCollectionId === collection.id) {
              setSelectedCollectionId(null);
            }
            await loadData();
          },
        },
      ]
    );
  };

  const handleRemoveBookmark = async (fatwaId: string) => {
    light();
    try {
      const db = await getDatabase();
      await toggleBookmark(db, fatwaId);
      await loadData();
    } catch (e) {
      console.error('Failed to remove bookmark:', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Collections filter bar */}
      <View style={[styles.collectionsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.collectionsScroll}
        >
          {/* All Bookmarks tab */}
          <TouchableOpacity
            style={[
              styles.collectionChip,
              {
                backgroundColor: selectedCollectionId === null ? colors.primary : colors.surfaceSubtle,
                borderColor: selectedCollectionId === null ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              light();
              setSelectedCollectionId(null);
            }}
          >
            <Ionicons
              name="bookmarks-outline"
              size={14}
              color={selectedCollectionId === null ? '#FFFFFF' : colors.textMuted}
            />
            <Text
              style={[
                styles.collectionText,
                { color: selectedCollectionId === null ? '#FFFFFF' : colors.text },
              ]}
            >
              {settings.language === 'bn' ? 'সব সংরক্ষিত' : 'All Bookmarks'}
            </Text>
          </TouchableOpacity>

          {/* User Collections */}
          {collections.map((col) => {
            const isSelected = selectedCollectionId === col.id;
            return (
              <TouchableOpacity
                key={col.id}
                onLongPress={() => handleDeleteCollection(col)}
                style={[
                  styles.collectionChip,
                  {
                    backgroundColor: isSelected ? col.color || colors.primary : colors.surfaceSubtle,
                    borderColor: isSelected ? col.color || colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  light();
                  setSelectedCollectionId(col.id);
                }}
              >
                <Ionicons
                  name="folder-outline"
                  size={14}
                  color={isSelected ? '#FFFFFF' : col.color || colors.textMuted}
                />
                <Text
                  style={[
                    styles.collectionText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {col.name} {(col.count ?? 0) > 0 ? `(${col.count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* New Collection Button */}
          <TouchableOpacity
            style={[styles.addCollectionBtn, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
            onPress={() => {
              light();
              setIsModalVisible(true);
            }}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.addCollectionText, { color: colors.primary }]}>
              {settings.language === 'bn' ? 'নতুন কালেকশন' : 'New Collection'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Bookmarks List */}
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) =>
          item.fatwa ? (
            <FatwaCard
              fatwa={item.fatwa}
              isBookmarked={true}
              onPress={() => router.push(`/fatwa/${item.fatwa_id}`)}
              onToggleBookmark={() => handleRemoveBookmark(item.fatwa_id)}
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={settings.language === 'bn' ? 'কোন সংরক্ষিত ফতোয়া নেই' : 'No Bookmarks Found'}
            description={
              selectedCollectionId
                ? settings.language === 'bn'
                  ? 'এই কালেকশনে এখনও কোন ফতোয়া সংরক্ষণ করা হয়নি।'
                  : 'No fatwas have been added to this collection yet.'
                : settings.language === 'bn'
                ? 'পছন্দের ফতোয়া পরবর্তীতে দ্রুত পড়ার জন্য বুকমার্ক আইকনে ট্যাপ করে সংরক্ষণ করুন।'
                : 'Tap the bookmark icon on any fatwa to save it for quick offline reading.'
            }
            icon="bookmark-outline"
          />
        }
      />

      {/* Collection Creation Modal */}
      <CollectionModal
        visible={isModalVisible}
        collections={collections}
        selectedCollectionId={selectedCollectionId}
        onSelectCollection={(colId) => {
          setSelectedCollectionId(colId);
          setIsModalVisible(false);
        }}
        onCreateCollection={handleCreateCollection}
        onClose={() => setIsModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  collectionsBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  collectionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  collectionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addCollectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 4,
  },
  addCollectionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
});
