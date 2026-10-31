import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { Button } from '../src/components/ui/Button';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="sparkles" size={56} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Personal AI Life Assistant</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your intelligent companion for events, smart task management, daily briefings, and effortless scheduling.
        </Text>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>Sync with Google Calendar</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-done-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>Prioritize daily tasks and deadlines</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>Natural language AI conversational scheduling</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Get Started"
          onPress={() => router.push('/register')}
          size="lg"
          style={styles.btn}
        />
        <Button
          title="I already have an account"
          variant="outline"
          onPress={() => router.push('/login')}
          size="lg"
          style={styles.btn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 32,
  },
  content: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
    paddingHorizontal: 16,
  },
  features: {
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
  },
  actions: {
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  btn: {
    width: '100%',
  },
});
