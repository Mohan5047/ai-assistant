import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export interface OfflineBannerProps {
  isOffline?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline = false }) => {
  const { colors } = useTheme();

  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.warning }]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
      <Text style={styles.text}>You are currently offline. Changes will sync when reconnected.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
