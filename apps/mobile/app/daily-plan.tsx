import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { DailyPlanResponse } from '@personal-ai-assistant/shared';
import { useTheme } from '../src/context/ThemeContext';
import { apiClient } from '../src/lib/api-client';
import { Header } from '../src/components/ui/Header';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';

export default function DailyPlanScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [plan, setPlan] = useState<DailyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      const data = await apiClient.ai.getDailyPlan();
      setPlan(data);
    } catch (err: any) {
      console.warn('Failed to fetch daily plan:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlan();
  };

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="AI Daily Plan"
        canGoBack
        onBackPress={() => router.back()}
        rightAction={
          <TouchableOpacity onPress={onRefresh} style={{ padding: 4 }}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.dateHeader}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{todayStr}</Text>
          <Text style={[styles.title, { color: colors.text }]}>Optimized Day Schedule</Text>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* AI Summary Card */}
            <Card style={{ backgroundColor: colors.primaryLight, borderColor: 'transparent' }}>
              <View style={styles.cardHeader}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={[styles.cardTag, { color: colors.primary }]}>AI STRATEGY</Text>
              </View>
              <Text style={[styles.summaryText, { color: colors.text }]}>
                {plan?.explanation ||
                  'Your daily plan prioritizes critical tasks during morning focus hours, followed by collaborative meetings and wrap-up reviews in the afternoon.'}
              </Text>
            </Card>

            {/* Time Blocks */}
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>SCHEDULE BLOCKS</Text>

            {plan?.suggestedSchedule && plan.suggestedSchedule.length > 0 ? (
              plan.suggestedSchedule.map((slot, index) => (
                <Card key={index} style={styles.slotCard}>
                  <View style={styles.slotRow}>
                    <View style={styles.timeBox}>
                      <Text style={[styles.timeText, { color: colors.primary }]}>
                        {slot.start}
                      </Text>
                      <Text style={[styles.timeEnd, { color: colors.textMuted }]}>
                        {slot.end}
                      </Text>
                    </View>

                    <View style={[styles.bar, { backgroundColor: colors.primary }]} />

                    <View style={styles.slotContent}>
                      <Text style={[styles.slotTitle, { color: colors.text }]}>{slot.title}</Text>
                      {slot.type && (
                        <Badge
                          label={slot.type.toUpperCase()}
                          variant={slot.type === 'task' ? 'info' : 'default'}
                          size="sm"
                          style={{ marginTop: 6 }}
                        />
                      )}
                    </View>
                  </View>
                </Card>
              ))
            ) : (
              <Card style={{ padding: 20, alignItems: 'center' }}>
                <Ionicons name="sunny-outline" size={40} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No scheduled blocks</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Add events or tasks, or tap the AI Assistant to generate a personalized timeline.
                </Text>
                <Button
                  title="Chat with Assistant"
                  onPress={() => router.push('/(tabs)/ai')}
                  size="sm"
                  style={{ marginTop: 16 }}
                />
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  dateHeader: {
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  slotCard: {
    padding: 12,
    marginBottom: 8,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBox: {
    width: 60,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  timeEnd: {
    fontSize: 11,
    marginTop: 2,
  },
  bar: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    marginHorizontal: 10,
  },
  slotContent: {
    flex: 1,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  slotActivity: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
