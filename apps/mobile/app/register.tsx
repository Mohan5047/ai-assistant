import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Header } from '../src/components/ui/Header';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({
        displayName: name.trim(),
        email: email.trim(),
        password,
        timezone,
      });
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Create Account" canGoBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, { color: colors.text }]}>Join Assistant</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          Create an account to start managing your daily schedule with AI.
        </Text>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2', borderColor: colors.danger }]}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <Input
          label="Full Name"
          placeholder="Jane Doe"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="Email Address"
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Input
          label="Password (min 8 chars)"
          placeholder="••••••••"
          isPassword
          value={password}
          onChangeText={setPassword}
        />

        <Input
          label="Timezone (IANA)"
          placeholder="UTC"
          value={timezone}
          onChangeText={setTimezone}
          helperText="Detected automatically from device settings"
        />

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          size="lg"
          style={styles.submitBtn}
        />

        <View style={styles.footerRow}>
          <Text style={{ color: colors.textSecondary }}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 6 }}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  submitBtn: {
    marginTop: 8,
    marginBottom: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
});
