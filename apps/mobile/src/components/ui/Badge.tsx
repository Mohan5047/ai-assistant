import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  style,
}) => {
  const { colors } = useTheme();

  let bg = colors.surfaceSubtle;
  let text = colors.textSecondary;

  if (variant === 'success') {
    bg = '#DCFCE7';
    text = '#15803D';
  } else if (variant === 'warning') {
    bg = '#FEF3C7';
    text = '#B45309';
  } else if (variant === 'danger') {
    bg = '#FEE2E2';
    text = '#B91C1C';
  } else if (variant === 'info') {
    bg = colors.primaryLight;
    text = colors.primary;
  }

  const paddingV = size === 'sm' ? 2 : 4;
  const paddingH = size === 'sm' ? 6 : 10;
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: text, fontSize }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
