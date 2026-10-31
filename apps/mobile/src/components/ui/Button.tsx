import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  ...props
}) => {
  const { colors } = useTheme();

  let backgroundColor = colors.primary;
  let textColor = '#FFFFFF';
  let borderColor = 'transparent';
  let borderWidth = 0;

  if (variant === 'secondary') {
    backgroundColor = colors.surfaceSubtle;
    textColor = colors.text;
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    borderColor = colors.border;
    borderWidth = 1;
    textColor = colors.text;
  } else if (variant === 'danger') {
    backgroundColor = colors.danger;
    textColor = '#FFFFFF';
  } else if (variant === 'ghost') {
    backgroundColor = 'transparent';
    textColor = colors.primary;
  }

  const paddingVertical = size === 'sm' ? 8 : size === 'lg' ? 14 : 12;
  const paddingHorizontal = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          paddingVertical,
          paddingHorizontal,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: textColor, fontSize, marginLeft: icon ? 8 : 0 },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});
