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
import type { DashboardSummary } from '@personal-ai-assistant/shared';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { apiClient } from '../../src/lib/api-client';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient.dashboard.getSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await apiClient.tasks.complete(taskId);
      fetchDashboard();
    } catch (err: any) {
      console.warn('Failed to complete task:', err);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  if (loading && !summary) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>
              {getGreeting()}, {user?.displayName?.split(' ')[0] || 'there'}!
            </Text>
            <Text style={[styles.dateSub, { color: colors.textSecondary }]}>
              {todayFormatted} • {user?.timezone || 'UTC'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => router.push('/profile')}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Action Bar */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/event/new')}
          >
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>+ Event</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/task/new')}
          >
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={[styles.quickActionText, { color: colors.text }]}>+ Task</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/daily-plan')}
          >
            <Ionicons name="sparkles" size={20} color="#F59E0B" />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Daily Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.primary }]}>
              {summary?.todayEvents?.length || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Events Today</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>
              {summary?.todayTasks?.length || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tasks Due</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.danger }]}>
              {summary?.overdueTasks?.length || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overdue</Text>
          </Card>
        </View>

        {/* AI Briefing */}
        <Card style={{ backgroundColor: colors.primaryLight, borderColor: 'transparent' }}>
          <View style={styles.cardHeader}>
            <View style={styles.aiLabelRow}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.aiBadge, { color: colors.primary }]}>AI BRIEFING</Text>
            </View>
          </View>
          <Text style={[styles.briefingText, { color: colors.text }]}>
            {summary?.dailyBriefing?.summary ||
              "You're all caught up! Use the AI Assistant to plan your day, schedule meetings, or organize your pending goals."}
          </Text>
        </Card>

        {/* Today's Schedule */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Schedule</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See Calendar</Text>
          </TouchableOpacity>
        </View>

        {summary?.todayEvents && summary.todayEvents.length > 0 ? (
          summary.todayEvents.map((evt) => (
            <TouchableOpacity
              key={evt.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/event/${evt.id}`)}
            >
              <Card style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                    {evt.title}
                  </Text>
                  {evt.googleEventId && (
                    <Badge label="Google" variant="info" size="sm" />
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {evt.isAllDay
                      ? 'All Day'
                      : `${new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </Text>
                  {evt.location && (
                    <>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 8 }} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {evt.location}
                      </Text>
                    </>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No events scheduled for today.
            </Text>
          </Card>
        )}

        {/* Due & Overdue Tasks */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasks to Tackle</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All Tasks</Text>
          </TouchableOpacity>
        </View>

        {summary?.overdueTasks && summary.overdueTasks.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.subSectionTitle, { color: colors.danger }]}>OVERDUE</Text>
            {summary.overdueTasks.map((t) => (
              <Card key={t.id} style={[styles.itemCard, { borderColor: '#FECACA' }]}>
                <View style={styles.itemHeader}>
                  <TouchableOpacity
                    style={styles.checkRow}
                    onPress={() => handleToggleTask(t.id)}
                  >
                    <Ionicons name="ellipse-outline" size={20} color={colors.danger} />
                    <Text style={[styles.itemTitle, { color: colors.text, marginLeft: 8 }]}>
                      {t.title}
                    </Text>
                  </TouchableOpacity>
                  <Badge label={t.priority} variant="danger" size="sm" />
                </View>
              </Card>
            ))}
          </View>
        )}

        {summary?.todayTasks && summary.todayTasks.length > 0 ? (
          summary.todayTasks.map((t) => (
            <Card key={t.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => handleToggleTask(t.id)}
                >
                  <Ionicons name="ellipse-outline" size={20} color={colors.primary} />
                  <Text style={[styles.itemTitle, { color: colors.text, marginLeft: 8 }]}>
                    {t.title}
                  </Text>
                </TouchableOpacity>
                <Badge
                  label={t.priority}
                  variant={t.priority === 'HIGH' || t.priority === 'URGENT' ? 'danger' : 'info'}
                  size="sm"
                />
              </View>
            </Card>
          ))
        ) : (
          (!summary?.overdueTasks || summary.overdueTasks.length === 0) && (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                All clear! No tasks due today.
              </Text>
            </Card>
          )
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
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
  },
  dateSub: {
    fontSize: 13,
    marginTop: 2,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  briefingText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemCard: {
    marginBottom: 8,
    padding: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyText: {
    fontSize: 13,
  },
});
