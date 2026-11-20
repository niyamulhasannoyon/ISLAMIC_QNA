import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';

interface BengaliTextProps extends TextProps {
  size?: number;
  weight?: '400' | '500' | '600' | '700';
  color?: string;
  lineHeightMultiplier?: number;
}

export const BengaliText: React.FC<BengaliTextProps> = ({
  children,
  size = 15,
  weight = '400',
  color,
  lineHeightMultiplier = 1.45,
  style,
  ...rest
}) => {
  const { fontScale } = useSettings();
  const { colors } = useTheme();

  const scaledSize = Math.round(size * fontScale);
  const calculatedLineHeight = Math.round(scaledSize * lineHeightMultiplier);

  return (
    <Text
      style={[
        {
          fontSize: scaledSize,
          fontWeight: weight,
          lineHeight: calculatedLineHeight,
          color: color || colors.text,
        },
        style,
      ]}
      accessibilityRole="text"
      {...rest}
    >
      {children}
    </Text>
  );
};
