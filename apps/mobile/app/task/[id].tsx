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
import type { TaskResponse } from '@personal-ai-assistant/shared';
import { useTheme } from '../../src/context/ThemeContext';
import { apiClient } from '../../src/lib/api-client';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  const [task, setTask] = useState<TaskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTask = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiClient.tasks.get(id);
      setTask(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch task.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleToggleComplete = async () => {
    if (!id) return;
    setCompleting(true);
    try {
      const updated = await apiClient.tasks.complete(id);
      setTask(updated);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete task.');
    } finally {
      setCompleting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          setDeleting(true);
          try {
            await apiClient.tasks.delete(id);
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete task.');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading || !task) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const isDone = task.status === 'DONE';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Task Details"
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
          <Badge
            label={task.status}
            variant={isDone ? 'success' : 'info'}
          />
          <Badge
            label={task.priority}
            variant={task.priority === 'HIGH' || task.priority === 'URGENT' ? 'danger' : 'warning'}
          />
        </View>

        <Text style={[styles.title, { color: colors.text }, isDone && styles.strikethrough]}>
          {task.title}
        </Text>

        <Card style={styles.detailsCard}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <View style={styles.detailTextCol}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Due Date</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date set'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailItem}>
            <Ionicons name="flag-outline" size={20} color={colors.primary} />
            <View style={styles.detailTextCol}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Priority Level</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{task.priority}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailItem}>
            <Ionicons
              name={isDone ? 'checkmark-circle-outline' : 'ellipse-outline'}
              size={20}
              color={isDone ? '#10B981' : colors.primary}
            />
            <View style={styles.detailTextCol}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {isDone ? 'Completed' : 'Pending'}
              </Text>
            </View>
          </View>
        </Card>

        {task.description && (
          <Card style={styles.descCard}>
            <Text style={[styles.descTitle, { color: colors.textSecondary }]}>DESCRIPTION</Text>
            <Text style={[styles.descBody, { color: colors.text }]}>{task.description}</Text>
          </Card>
        )}

        <Button
          title={isDone ? 'Mark as Incomplete' : 'Mark as Completed'}
          variant={isDone ? 'outline' : 'primary'}
          onPress={handleToggleComplete}
          loading={completing}
          size="lg"
          style={{ marginTop: 12 }}
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
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
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
