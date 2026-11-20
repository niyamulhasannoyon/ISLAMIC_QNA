import React from 'react';
import { Text, TextProps, I18nManager } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';

interface ArabicTextProps extends TextProps {
  size?: number;
  weight?: '400' | '600' | '700';
  color?: string;
}

export const ArabicText: React.FC<ArabicTextProps> = ({
  children,
  size = 20,
  weight = '400',
  color,
  style,
  ...rest
}) => {
  const { fontScale } = useSettings();
  const { colors } = useTheme();

  const scaledSize = Math.round(size * fontScale);
  const calculatedLineHeight = Math.round(scaledSize * 1.6);

  return (
    <Text
      style={[
        {
          fontSize: scaledSize,
          fontWeight: weight,
          lineHeight: calculatedLineHeight,
          color: color || colors.arabicColor,
          textAlign: 'right',
          writingDirection: 'rtl',
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
