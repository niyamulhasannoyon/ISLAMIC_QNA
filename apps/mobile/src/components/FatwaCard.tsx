import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { BengaliText } from './BengaliText';
import type { LocalFatwa } from '../types';

interface FatwaCardProps {
  fatwa: LocalFatwa;
  onPress: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

export const FatwaCard: React.FC<FatwaCardProps> = ({
  fatwa,
  onPress,
  isBookmarked = false,
  onToggleBookmark,
}) => {
  const { colors } = useTheme();
  const { light } = useHaptics();

  /**
   * Safe parser for snippets containing <mark>...</mark> highlights
   */
  const renderHighlightedSnippet = (snippetText: string) => {
    if (!snippetText) return null;
    const parts = snippetText.split(/(<mark[^>]*>.*?<\/mark>)/gi);

    return (
      <Text style={{ lineHeight: 22 }}>
        {parts.map((part, idx) => {
          if (part.startsWith('<mark') || part.startsWith('<MARK')) {
            const clean = part.replace(/<\/?[^>]+(>|$)/g, '');
            return (
              <Text
                key={idx}
                style={{
                  backgroundColor: colors.markBg,
                  color: colors.markText,
                  fontWeight: '700',
                  paddingHorizontal: 2,
                  borderRadius: 3,
                }}
              >
                {clean}
              </Text>
            );
          }
          const cleanPart = part.replace(/<\/?[^>]+(>|$)/g, '');
          return (
            <Text key={idx} style={{ color: colors.textSecondary }}>
              {cleanPart}
            </Text>
          );
        })}
      </Text>
    );
  };

  const getSourceDisplay = (source: string) => {
    if (source === 'at-tahreek') return 'আত-তাহরীক';
    if (source === 'al-kawsar') return 'আল-কাউসার';
    return 'আল-ইতিসাম';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.cardShadow,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Fatwa: ${fatwa.title}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <View style={[styles.sourceBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.badgeText, { color: colors.primaryDark }]}>
              {getSourceDisplay(fatwa.source)}
            </Text>
          </View>
          {fatwa.category ? (
            <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.categoryText, { color: colors.textMuted }]}>
                {fatwa.category}
              </Text>
            </View>
          ) : null}
        </View>

        {onToggleBookmark ? (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              light();
              onToggleBookmark();
            }}
            accessibilityRole="button"
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark fatwa'}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isBookmarked ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <BengaliText size={16} weight="700" style={styles.title}>
        {fatwa.title}
      </BengaliText>

      <View style={styles.snippetContainer}>
        {fatwa.snippet ? (
          renderHighlightedSnippet(fatwa.snippet)
        ) : (
          <BengaliText size={14} color={colors.textSecondary} numberOfLines={3}>
            {fatwa.answer.replace(/<\/?[^>]+(>|$)/g, '')}
          </BengaliText>
        )}
      </View>

      {fatwa.scholar ? (
        <BengaliText size={12} weight="500" color={colors.primaryDark} style={styles.scholar}>
          — {fatwa.scholar}
        </BengaliText>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    marginBottom: 8,
  },
  snippetContainer: {
    marginBottom: 6,
  },
  scholar: {
    marginTop: 4,
  },
});
