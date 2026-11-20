import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.skeletonCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.badgeRow}>
            <Animated.View
              style={[
                styles.badgeSkeleton,
                { backgroundColor: colors.surfaceSubtle, opacity },
              ]}
            />
            <Animated.View
              style={[
                styles.badgeSkeleton,
                { width: 70, backgroundColor: colors.surfaceSubtle, opacity },
              ]}
            />
          </View>

          <Animated.View
            style={[
              styles.line,
              { width: '85%', height: 18, backgroundColor: colors.surfaceSubtle, opacity },
            ]}
          />
          <Animated.View
            style={[
              styles.line,
              { width: '60%', height: 18, backgroundColor: colors.surfaceSubtle, opacity },
            ]}
          />

          <View style={{ marginTop: 8 }}>
            <Animated.View
              style={[
                styles.line,
                { width: '100%', height: 12, backgroundColor: colors.surfaceSubtle, opacity },
              ]}
            />
            <Animated.View
              style={[
                styles.line,
                { width: '92%', height: 12, backgroundColor: colors.surfaceSubtle, opacity },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  skeletonCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badgeSkeleton: {
    width: 60,
    height: 20,
    borderRadius: 6,
  },
  line: {
    borderRadius: 4,
    marginBottom: 6,
  },
});
