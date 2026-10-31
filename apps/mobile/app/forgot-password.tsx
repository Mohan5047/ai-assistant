import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { apiClient } from '../src/lib/api-client';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Header } from '../src/components/ui/Header';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiClient.auth.forgotPassword(email.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Reset Password" canGoBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {success ? (
          <View style={styles.successState}>
            <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="mail-unread" size={40} color="#15803D" />
            </View>
            <Text style={[styles.heading, { color: colors.text, textAlign: 'center' }]}>
              Check Your Inbox
            </Text>
            <Text style={[styles.subheading, { color: colors.textSecondary, textAlign: 'center' }]}>
              If an account exists for {email}, a password reset link has been dispatched.
            </Text>
            <Button
              title="Return to Sign In"
              onPress={() => router.replace('/login')}
              size="lg"
              style={{ width: '100%', marginTop: 24 }}
            />
          </View>
        ) : (
          <>
            <Text style={[styles.heading, { color: colors.text }]}>Forgot Password?</Text>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>
              Enter your registered email address. We will send you instructions to safely reset your password.
            </Text>

            {error && (
              <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2', borderColor: colors.danger }]}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            )}

            <Input
              label="Email Address"
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Button
              title="Send Reset Instructions"
              onPress={handleSubmit}
              loading={loading}
              size="lg"
              style={styles.submitBtn}
            />
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
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
});
