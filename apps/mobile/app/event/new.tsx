import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { apiClient } from '../../src/lib/api-client';
import { Header } from '../../src/components/ui/Header';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';

export default function NewEventScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDateStr, setStartDateStr] = useState(
    new Date(Date.now() + 3600000).toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
  );
  const [endDateStr, setEndDateStr] = useState(
    new Date(Date.now() + 7200000).toISOString().slice(0, 16)
  );
  const [isAllDay, setIsAllDay] = useState(false);
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Event title is required.');
      return;
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Please enter valid dates in YYYY-MM-DDTHH:mm format.');
      return;
    }

    if (end <= start) {
      setError('End time must be after start time.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await apiClient.events.create({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        isAllDay,
        timezone,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to create event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Create Event"
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
          label="Event Title *"
          placeholder="e.g. Design Team Sync"
          value={title}
          onChangeText={setTitle}
        />

        <Input
          label="Location"
          placeholder="e.g. Conference Room A or Zoom link"
          value={location}
          onChangeText={setLocation}
        />

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text }]}>All-Day Event</Text>
          <Switch
            value={isAllDay}
            onValueChange={setIsAllDay}
            trackColor={{ false: '#CBD5E1', true: colors.primary }}
          />
        </View>

        <Input
          label="Start Time (ISO or YYYY-MM-DDTHH:mm) *"
          placeholder="2026-11-01T10:00"
          value={startDateStr}
          onChangeText={setStartDateStr}
        />

        <Input
          label="End Time (ISO or YYYY-MM-DDTHH:mm) *"
          placeholder="2026-11-01T11:00"
          value={endDateStr}
          onChangeText={setEndDateStr}
        />

        <Input
          label="Timezone"
          placeholder="UTC"
          value={timezone}
          onChangeText={setTimezone}
        />

        <Input
          label="Description"
          placeholder="Meeting agenda, notes, or links..."
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          style={{ height: 90, textAlignVertical: 'top' }}
        />

        <Button
          title="Save Event"
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
