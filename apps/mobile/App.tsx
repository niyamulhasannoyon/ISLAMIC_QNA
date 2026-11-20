import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createApiClient, type SearchResultItem } from '@repo/api-client';
import { normalizeBengaliText, stemBengaliToken } from '@repo/text-utils';

const client = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://fatwa-search.vercel.app',
});

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      // Local text-utils normalization prior to transmission or offline index query
      const normalizedQuery = normalizeBengaliText(query);
      const res = await client.search({ q: normalizedQuery, limit: 15 });
      setResults(res.results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.title}>ফতোয়া অনুসন্ধান (Fatwa Search)</Text>
        <Text style={styles.subtitle}>
          আল-ইতিসাম, আত-তাহরীক ও আল-কাউসার আর্কাইভ
        </Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="প্রশ্ন বা কীওয়ার্ড লিখুন (যেমন: ওযু, নামাজ, রোজা)..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>খুঁজুন</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#047857" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>কোন ফলাফল পাওয়া যায়নি</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.badgeRow}>
                <Text style={styles.sourceBadge}>{item.source}</Text>
                <Text style={styles.categoryBadge}>{item.category}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSnippet} numberOfLines={3}>
                {item.snippet ? item.snippet.replace(/<\/?[^>]+(>|$)/g, '') : item.answer}
              </Text>
              {item.scholar ? (
                <Text style={styles.scholarText}>— {item.scholar}</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065F46',
  },
  subtitle: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  list: {
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  sourceBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadge: {
    fontSize: 11,
    color: '#4B5563',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  cardSnippet: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  scholarText: {
    fontSize: 12,
    color: '#047857',
    fontStyle: 'italic',
    marginTop: 6,
  },
  center: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
  },
});
