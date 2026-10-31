import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NotificationPreferences } from '@personal-ai-assistant/shared';
import { useTheme } from '../src/context/ThemeContext';
import { apiClient } from '../src/lib/api-client';
import { Header } from '../src/components/ui/Header';
import { Card } from '../src/components/ui/Card';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email: true,
    push: true,
    reminderMinutesBefore: 15,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchPrefs = useCallback(async () => {
    try {
      const data = await apiClient.notifications.getPreferences();
      setPrefs(data);
    } catch (err: any) {
      console.warn('Failed to load notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await apiClient.notifications.updatePreferences(prefs);
      setPrefs(updated);
      Alert.alert('Success', 'Notification preferences saved successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPush = async () => {
    setTesting(true);
    try {
      const result = await apiClient.notifications.sendTestPush();
      Alert.alert(
        'Test Push Triggered',
        `Dispatched test notification to ${result.sent} active device(s).`
      );
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Failed to dispatch test notification.');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Notification Settings"
        canGoBack
        onBackPress={() => router.back()}
        rightAction={
          <Button
            title="Save"
            onPress={handleSave}
            loading={saving}
            size="sm"
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Delivery Channels */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>CHANNELS</Text>
        <Card style={styles.card}>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Push Notifications</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                Real-time reminders on your mobile device
              </Text>
            </View>
            <Switch
              value={prefs.push}
              onValueChange={(val) => setPrefs({ ...prefs, push: val })}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Email Reminders</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                Important schedule updates to your inbox
              </Text>
            </View>
            <Switch
              value={prefs.email}
              onValueChange={(val) => setPrefs({ ...prefs, email: val })}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
            />
          </View>
        </Card>

        {/* Quiet Hours */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>QUIET HOURS</Text>
        <Card style={styles.card}>
          <Text style={[styles.quietNote, { color: colors.textSecondary }]}>
            During quiet hours, push notifications will be silenced except for urgent alarms.
          </Text>

          <View style={styles.quietHoursRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Input
                label="Start Time (HH:mm)"
                placeholder="22:00"
                value={prefs.quietHoursStart || '22:00'}
                onChangeText={(val) => setPrefs({ ...prefs, quietHoursStart: val })}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Input
                label="End Time (HH:mm)"
                placeholder="07:00"
                value={prefs.quietHoursEnd || '07:00'}
                onChangeText={(val) => setPrefs({ ...prefs, quietHoursEnd: val })}
              />
            </View>
          </View>

          <Input
            label="Default Advance Notice (Minutes)"
            placeholder="15"
            keyboardType="number-pad"
            value={String(prefs.reminderMinutesBefore || 15)}
            onChangeText={(val) =>
              setPrefs({ ...prefs, reminderMinutesBefore: parseInt(val, 10) || 15 })
            }
            helperText="Minutes before an event to receive your notification"
          />
        </Card>

        {/* Testing Device Push */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>DIAGNOSTICS</Text>
        <Card style={styles.card}>
          <View style={styles.testRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Test Push Notification</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                Verify that your device token is registered and active
              </Text>
            </View>
            <Button
              title="Send Test"
              variant="outline"
              size="sm"
              loading={testing}
              onPress={handleTestPush}
            />
          </View>
        </Card>

        <Button
          title="Save Preferences"
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={{ marginTop: 8 }}
        />
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
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 12,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowTextCol: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  quietNote: {
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  quietHoursRow: {
    flexDirection: 'row',
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
