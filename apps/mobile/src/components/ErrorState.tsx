import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BengaliText } from './BengaliText';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  isOffline?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  isOffline = false,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceSubtle }]}>
        <Ionicons
          name={isOffline ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={36}
          color={colors.primary}
        />
      </View>
      <BengaliText size={17} weight="600" color={colors.text} style={styles.title}>
        {isOffline ? 'অফলাইন মোড সক্রিয়' : 'অনুরোধ সম্পন্ন করা যায়নি'}
      </BengaliText>
      <BengaliText size={14} color={colors.textMuted} style={styles.message}>
        {message ||
          (isOffline
            ? 'ডিভাইসে সংরক্ষিত ফতোয়া থেকে অনুসন্ধান ফলাফল দেখানো হচ্ছে।'
            : 'অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।')}
      </BengaliText>

      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Retry search"
        >
          <BengaliText size={14} weight="600" color="#FFFFFF">
            আবার চেষ্টা করুন
          </BengaliText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    maxWidth: 290,
    marginBottom: 18,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
