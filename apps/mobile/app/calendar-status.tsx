import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { GoogleCalendarStatus } from '@personal-ai-assistant/shared';
import { useTheme } from '../src/context/ThemeContext';
import { apiClient } from '../src/lib/api-client';
import { Header } from '../src/components/ui/Header';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';

export default function CalendarStatusScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiClient.calendar.getStatus();
      setStatus(data);
    } catch (err: any) {
      console.warn('Failed to load Google Calendar status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.calendar.sync();
      Alert.alert(
        'Sync Complete',
        `Synchronized successfully!\nImported: ${res.importedCount}\nUpdated: ${res.updatedCount}\nDeleted: ${res.deletedCount}`
      );
      fetchStatus();
    } catch (err: any) {
      Alert.alert('Sync Error', err.message || 'Failed to synchronize with Google Calendar.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Google Calendar',
      'Are you sure you want to disconnect? Events already synced will remain, but automatic updates will stop.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setDisconnecting(true);
            try {
              await apiClient.calendar.disconnect();
              fetchStatus();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to disconnect Google Calendar.');
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ]
    );
  };

  const handleConnect = async () => {
    try {
      const res = await apiClient.calendar.getAuthUrl();
      Alert.alert(
        'Connect Google Calendar',
        `OAuth Authorization URL:\n${res.authUrl}\n\nOpen this in your browser to authorize access, then return to the app.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to initiate Google Calendar connection.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const isConnected = !!status?.isConnected;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Google Calendar"
        canGoBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="calendar" size={32} color={colors.primary} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.title, { color: colors.text }]}>Google Calendar Sync</Text>
              <Badge
                label={isConnected ? 'Connected' : 'Disconnected'}
                variant={isConnected ? 'success' : 'default'}
                style={{ marginTop: 4 }}
              />
            </View>
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Two-way synchronization allows events created or modified in Google Calendar to be reflected in your assistant, and vice-versa.
          </Text>

          {isConnected ? (
            <View style={styles.connectedDetails}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Account Email</Text>
                <Text style={[styles.detailVal, { color: colors.text }]}>
                  {status?.accountEmail || 'Connected Account'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Last Synced</Text>
                <Text style={[styles.detailVal, { color: colors.text }]}>
                  {status?.lastSyncedAt
                    ? new Date(status.lastSyncedAt).toLocaleString()
                    : 'Never'}
                </Text>
              </View>

              {status?.lastSyncError && (
                <View style={[styles.errorBox, { borderColor: colors.danger }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {status.lastSyncError}
                  </Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <Button
                  title="Sync Now"
                  onPress={handleSyncNow}
                  loading={syncing}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Disconnect"
                  variant="outline"
                  onPress={handleDisconnect}
                  loading={disconnecting}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </View>
          ) : (
            <View style={styles.connectBox}>
              <Button
                title="Connect Google Calendar"
                icon={<Ionicons name="logo-google" size={18} color="#FFFFFF" />}
                onPress={handleConnect}
                size="lg"
                style={{ width: '100%' }}
              />
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  connectedDetails: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailKey: {
    fontSize: 13,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FEE2E2',
    marginVertical: 16,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  connectBox: {
    marginTop: 8,
  },
});
