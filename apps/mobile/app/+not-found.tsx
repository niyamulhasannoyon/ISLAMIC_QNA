import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { BengaliText } from '../src/components/BengaliText';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'পাওয়া যায়নি' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
        <BengaliText size={20} weight="700" style={styles.title}>
          পৃষ্ঠাটি খুঁজে পাওয়া যায়নি
        </BengaliText>
        <BengaliText size={15} color={colors.textMuted} style={styles.subtext}>
          আপনি যে পেজটিতে যাওয়ার চেষ্টা করছেন তা বিদ্যমান নেই।
        </BengaliText>

        <Link href="/" asChild>
          <TouchableOpacity style={[styles.homeBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="home-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.homeBtnText}>প্রধান পাতায় ফিরে যান</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
  },
  subtext: {
    textAlign: 'center',
    marginBottom: 24,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
