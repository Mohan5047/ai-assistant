import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Card } from '../../src/components/ui/Card';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/welcome');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings & Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/profile')}>
          <Card style={styles.profileCard}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName || 'User'}</Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
              <Text style={[styles.userTimezone, { color: colors.textMuted }]}>
                Timezone: {user?.timezone || 'UTC'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Card>
        </TouchableOpacity>

        {/* Integrations & Planning */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>APP FEATURES</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/calendar-status')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Google Calendar</Text>
                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                  Manage 2-way calendar sync
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/daily-plan')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="sparkles-outline" size={20} color="#D97706" />
              </View>
              <View>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Daily Planner</Text>
                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                  AI-assisted schedule planning
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/notifications')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconWrap, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="notifications-outline" size={20} color="#7C3AED" />
              </View>
              <View>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Notifications</Text>
                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                  Push, quiet hours & reminder preferences
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Preferences */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>PREFERENCES</Text>
        <Card style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSubtle }]}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={20}
                  color={isDark ? '#F59E0B' : '#EA580C'}
                />
              </View>
              <View>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                  Toggle dark and light color scheme
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Account & Security */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>ACCOUNT & SECURITY</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#15803D" />
              </View>
              <View>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Profile & Data</Text>
                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                  GDPR export & account deletion
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              </View>
              <View>
                <Text style={[styles.menuItemTitle, { color: colors.danger }]}>Sign Out</Text>
                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                  Log out of this device
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* App Version */}
        <View style={styles.versionBox}>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>
            Personal AI Assistant Mobile v1.0.0 (Part 3)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  userTimezone: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    padding: 0,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  versionBox: {
    alignItems: 'center',
    marginTop: 12,
  },
  versionText: {
    fontSize: 11,
  },
});
