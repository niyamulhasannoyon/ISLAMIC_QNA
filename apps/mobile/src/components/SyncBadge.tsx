import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '../context/SyncContext';
import { useTheme } from '../context/ThemeContext';

export const SyncBadge: React.FC = () => {
  const { progress, triggerSync } = useSync();
  const { colors } = useTheme();

  if (progress.state === 'idle' && !progress.isOffline) {
    return null;
  }

  const getLabel = () => {
    if (progress.state === 'syncing') return 'সিঙ্ক হচ্ছে...';
    if (progress.isOffline) return 'অফলাইন ডেটা মোড';
    if (progress.state === 'synced') return `সিঙ্ক সম্পন্ন (${progress.totalSyncedCount})`;
    return 'সিঙ্ক ব্যর্থ';
  };

  const getIcon = () => {
    if (progress.state === 'syncing') return 'sync-outline';
    if (progress.isOffline) return 'cloud-offline-outline';
    if (progress.state === 'synced') return 'checkmark-circle-outline';
    return 'warning-outline';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={triggerSync}
      style={[
        styles.badge,
        {
          backgroundColor: progress.isOffline ? '#FEF3C7' : colors.primaryLight,
          borderColor: progress.isOffline ? '#F59E0B' : colors.primary,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Sync status: ${getLabel()}`}
    >
      <Ionicons
        name={getIcon()}
        size={13}
        color={progress.isOffline ? '#B45309' : colors.primaryDark}
      />
      <Text
        style={[
          styles.text,
          { color: progress.isOffline ? '#B45309' : colors.primaryDark },
        ]}
      >
        {getLabel()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
