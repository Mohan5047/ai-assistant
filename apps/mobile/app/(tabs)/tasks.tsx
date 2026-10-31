import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { TaskResponse } from '@personal-ai-assistant/shared';
import { useTheme } from '../../src/context/ThemeContext';
import { apiClient } from '../../src/lib/api-client';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { EmptyState } from '../../src/components/ui/EmptyState';

export default function TasksScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await apiClient.tasks.list({
        status: activeTab === 'ALL' ? undefined : (activeTab as any),
        search: search.trim() || undefined,
        limit: 50,
      });
      const items = (res as any)?.items ? (res as any).items : Array.isArray(res) ? res : [];
      setTasks(items);
    } catch (err) {
      console.warn('Failed to load tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await apiClient.tasks.complete(taskId);
      fetchTasks();
    } catch (err) {
      console.warn('Failed to complete task:', err);
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
      case 'HIGH':
        return 'danger';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
      default:
        return 'default';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Tasks</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/task/new')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          placeholder="Search tasks..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(['ALL', 'PENDING', 'DONE'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabBtn,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? colors.primary : colors.textSecondary },
                  isActive && { fontWeight: '700' },
                ]}
              >
                {tab === 'ALL' ? 'All' : tab === 'PENDING' ? 'Pending' : 'Completed'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Task List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : tasks.length > 0 ? (
          tasks.map((t) => {
            const isCompleted = t.status === 'DONE';
            return (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/task/${t.id}`)}
              >
                <Card style={[styles.taskCard, isCompleted ? { opacity: 0.7 } : undefined]}>
                  <View style={styles.taskHeader}>
                    <TouchableOpacity
                      style={styles.checkBtn}
                      onPress={() => handleToggleTask(t.id)}
                    >
                      <Ionicons
                        name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isCompleted ? '#10B981' : colors.primary}
                      />
                    </TouchableOpacity>

                    <View style={styles.taskInfo}>
                      <Text
                        style={[
                          styles.taskTitle,
                          { color: colors.text },
                          isCompleted && styles.completedTitle,
                        ]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>

                      {t.description && (
                        <Text style={[styles.taskDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {t.description}
                        </Text>
                      )}

                      <View style={styles.metaRow}>
                        <Badge label={t.priority} variant={getPriorityVariant(t.priority)} size="sm" />
                        {t.dueDate && (
                          <View style={styles.dueRow}>
                            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                            <Text style={[styles.dueText, { color: colors.textSecondary }]}>
                              Due {new Date(t.dueDate).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        ) : (
          <EmptyState
            icon="checkbox-outline"
            title="No Tasks Found"
            description="You don't have any tasks matching your current filter."
            actionTitle="+ Create Task"
            onAction={() => router.push('/task/new')}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  taskCard: {
    marginBottom: 8,
    padding: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkBtn: {
    padding: 2,
    marginRight: 10,
    marginTop: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 11,
  },
});
