import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { apiClient } from '../src/lib/api-client';
import { Header } from '../src/components/ui/Header';
import { Card } from '../src/components/ui/Card';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';

export default function ProfileScreen() {
  const { user, refreshProfile, logout } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [name, setName] = useState(user?.displayName || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.auth.updateProfile({
        displayName: name.trim(),
        timezone: timezone.trim() || 'UTC',
      });
      await refreshProfile();
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await apiClient.auth.exportData();
      Alert.alert(
        'GDPR Export Generated',
        `Export successfully compiled!\n\nUser: ${data.user.email}\nEvents: ${data.events.length}\nTasks: ${data.tasks.length}\nReminders: ${data.reminders.length}\nGenerated: ${new Date(data.exportedAt).toLocaleString()}`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to export account data.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmPassword || confirmEmail !== user?.email) {
      setDeleteError('Please type your exact email address and password to confirm.');
      return;
    }
    setDeleteError(null);
    setDeleting(true);
    try {
      await apiClient.auth.deleteAccount({
        password: confirmPassword,
        confirmEmail: confirmEmail.trim(),
      });
      setShowDeleteModal(false);
      await logout();
      router.replace('/welcome');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Profile & Privacy"
        canGoBack
        onBackPress={() => router.back()}
        rightAction={
          <Button
            title="Save"
            onPress={handleUpdate}
            loading={saving}
            size="sm"
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Profile Details */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>PERSONAL INFO</Text>
        <Card style={styles.card}>
          <Input
            label="Email Address"
            value={user?.email || ''}
            editable={false}
            helperText="Account email cannot be modified"
          />

          <Input
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Timezone (IANA)"
            placeholder="UTC or America/New_York"
            value={timezone}
            onChangeText={setTimezone}
            helperText="Used for daily briefings and accurate notification delivery"
          />

          <Button
            title="Update Profile"
            onPress={handleUpdate}
            loading={saving}
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Data Privacy & GDPR */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>DATA PRIVACY</Text>
        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Export Your Data (GDPR)</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Download a portable JSON archive of all your events, tasks, reminders, and settings.
          </Text>
          <Button
            title="Export Account Data"
            variant="outline"
            icon={<Ionicons name="download-outline" size={16} color={colors.text} />}
            onPress={handleExportData}
            loading={exporting}
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* Danger Zone */}
        <Text style={[styles.sectionHeading, { color: colors.danger }]}>DANGER ZONE</Text>
        <Card style={[styles.card, { borderColor: '#FECACA' }]}>
          <Text style={[styles.cardTitle, { color: colors.danger }]}>Delete Account</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Permanently delete your account and all associated data across events, tasks, AI threads, and calendar tokens. This action is irreversible.
          </Text>
          <Button
            title="Delete My Account"
            variant="danger"
            onPress={() => setShowDeleteModal(true)}
            style={{ marginTop: 12 }}
          />
        </Card>
      </ScrollView>

      {/* Account Deletion Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={32} color={colors.danger} />
              <Text style={[styles.modalTitle, { color: colors.danger }]}>Confirm Account Deletion</Text>
            </View>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              To confirm, please enter your email ({user?.email}) and account password.
            </Text>

            {deleteError && (
              <View style={[styles.errorBox, { borderColor: colors.danger }]}>
                <Text style={{ color: colors.danger, fontSize: 12 }}>{deleteError}</Text>
              </View>
            )}

            <Input
              label="Confirm Email"
              placeholder={user?.email || ''}
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              autoCapitalize="none"
            />

            <Input
              label="Password"
              placeholder="••••••••"
              isPassword
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Delete Permanently"
                variant="danger"
                loading={deleting}
                onPress={handleDeleteAccount}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  modalSub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FEE2E2',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
});
