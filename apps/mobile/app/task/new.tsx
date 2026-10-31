import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskPriority } from '@personal-ai-assistant/shared';
import { useTheme } from '../../src/context/ThemeContext';
import { apiClient } from '../../src/lib/api-client';
import { Header } from '../../src/components/ui/Header';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';

const PRIORITIES: TaskPriority[] = [
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.URGENT,
];

export default function NewTaskScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [dueDateStr, setDueDateStr] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10) // Tomorrow YYYY-MM-DD
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    let dueDateIso: string | undefined = undefined;
    if (dueDateStr.trim()) {
      const d = new Date(dueDateStr);
      if (isNaN(d.getTime())) {
        setError('Please enter a valid due date (YYYY-MM-DD).');
        return;
      }
      dueDateIso = d.toISOString();
    }

    setError(null);
    setLoading(true);

    try {
      await apiClient.tasks.create({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDateIso,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Create Task"
        canGoBack
        onBackPress={() => router.back()}
        rightAction={
          <Button
            title="Save"
            onPress={handleCreate}
            loading={loading}
            size="sm"
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {error && (
          <View style={[styles.errorBox, { borderColor: colors.danger, backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <Input
          label="Task Title *"
          placeholder="e.g. Finish quarterly project review"
          value={title}
          onChangeText={setTitle}
        />

        {/* Priority Selector */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => {
            const isSelected = priority === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  styles.priorityBtn,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Input
          label="Due Date (YYYY-MM-DD)"
          placeholder="2026-11-02"
          value={dueDateStr}
          onChangeText={setDueDateStr}
          helperText="Optional deadline for reminder notifications"
        />

        <Input
          label="Description"
          placeholder="Additional context, sub-tasks, or notes..."
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          style={{ height: 90, textAlignVertical: 'top' }}
        />

        <Button
          title="Save Task"
          onPress={handleCreate}
          loading={loading}
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
