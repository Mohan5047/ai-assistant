import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { EventResponse } from '@personal-ai-assistant/shared';
import { useTheme } from '../../src/context/ThemeContext';
import { apiClient } from '../../src/lib/api-client';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { EmptyState } from '../../src/components/ui/EmptyState';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      // Calculate start and end of selected day in ISO format
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const res = await apiClient.events.list({
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        limit: 50,
      });

      // Handle both paginated and array response
      const items = (res as any)?.items ? (res as any).items : Array.isArray(res) ? res : [];
      setEvents(items);
    } catch (err: any) {
      console.warn('Failed to load events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const changeDay = (offset: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offset);
    setSelectedDate(next);
  };

  const isToday =
    new Date().toDateString() === selectedDate.toDateString();

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(selectedDate);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Calendar Agenda</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/event/new')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Date Navigator */}
      <View style={[styles.dateNav, { backgroundColor: colors.surfaceSubtle }]}>
        <TouchableOpacity onPress={() => changeDay(-1)} style={styles.navArrow}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSelectedDate(new Date())} style={styles.dateLabelBox}>
          <Text style={[styles.dateLabel, { color: colors.text }]}>{formattedDate}</Text>
          {isToday && <Badge label="Today" variant="info" size="sm" style={{ marginTop: 2 }} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => changeDay(1)} style={styles.navArrow}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Agenda Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : events.length > 0 ? (
          events.map((evt) => (
            <TouchableOpacity
              key={evt.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/event/${evt.id}`)}
            >
              <Card style={styles.eventCard}>
                <View style={styles.eventRow}>
                  <View style={styles.timeColumn}>
                    <Text style={[styles.timeText, { color: colors.primary }]}>
                      {evt.isAllDay
                        ? 'All Day'
                        : new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {!evt.isAllDay && (
                      <Text style={[styles.timeSub, { color: colors.textMuted }]}>
                        {new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>

                  <View style={[styles.eventDivider, { backgroundColor: colors.primary }]} />

                  <View style={styles.infoColumn}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                        {evt.title}
                      </Text>
                      {evt.googleEventId ? (
                        <Badge label="Google" variant="info" size="sm" />
                      ) : (
                        <Badge label="Local" variant="default" size="sm" />
                      )}
                    </View>

                    {evt.description && (
                      <Text style={[styles.eventDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {evt.description}
                      </Text>
                    )}

                    {evt.location && (
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                        <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {evt.location}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No Events Scheduled"
            description={`You have nothing planned for ${formattedDate}.`}
            actionTitle="+ Create Event"
            onAction={() => router.push('/event/new')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  dateNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navArrow: {
    padding: 6,
  },
  dateLabelBox: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  eventCard: {
    marginBottom: 10,
    padding: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeColumn: {
    width: 65,
    alignItems: 'flex-start',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  timeSub: {
    fontSize: 11,
    marginTop: 2,
  },
  eventDivider: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    marginHorizontal: 10,
  },
  infoColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  eventDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontSize: 11,
  },
});
