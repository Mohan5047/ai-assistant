import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { EventResponse } from '@personal-ai-assistant/shared';
import { useTheme } from '../../src/context/ThemeContext';
import { apiClient } from '../../src/lib/api-client';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiClient.events.get(id);
      setEvent(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch event.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleDelete = () => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          setDeleting(true);
          try {
            await apiClient.events.delete(id);
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete event.');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading || !event) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const startFormatted = new Date(event.startTime).toLocaleString([], {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const endFormatted = new Date(event.endTime).toLocaleString([], {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Event Details"
        canGoBack
        onBackPress={() => router.back()}
        rightAction={
          <Button
            title="Delete"
            variant="danger"
            size="sm"
            loading={deleting}
            onPress={handleDelete}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.badgeRow}>
          {event.googleEventId ? (
            <Badge label="Google Calendar Event" variant="info" />
          ) : (
            <Badge label="Local Event" variant="default" />
          )}
          {event.isAllDay && <Badge label="All Day" variant="warning" />}
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>

        <Card style={styles.detailsCard}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <View style={styles.detailTextCol}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Start Time</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{startFormatted}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <View style={styles.detailTextCol}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>End Time</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{endFormatted}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailItem}>
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
            <View style={styles.detailTextCol}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Timezone</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{event.timezone}</Text>
            </View>
          </View>

          {event.location && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <View style={styles.detailTextCol}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{event.location}</Text>
                </View>
              </View>
            </>
          )}
        </Card>

        {event.description && (
          <Card style={styles.descCard}>
            <Text style={[styles.descTitle, { color: colors.textSecondary }]}>DESCRIPTION</Text>
            <Text style={[styles.descBody, { color: colors.text }]}>{event.description}</Text>
          </Card>
        )}
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
    padding: 20,
    paddingBottom: 40,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  detailsCard: {
    padding: 16,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailTextCol: {
    marginLeft: 14,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  descCard: {
    padding: 16,
    marginBottom: 16,
  },
  descTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  descBody: {
    fontSize: 14,
    lineHeight: 22,
  },
});
