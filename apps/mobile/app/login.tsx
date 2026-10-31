import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Header } from '../src/components/ui/Header';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Sign In" canGoBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, { color: colors.text }]}>Welcome Back</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          Sign in to access your calendar, tasks, and personal assistant.
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

        <Input
          label="Password"
          placeholder="••••••••"
          isPassword
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          onPress={() => router.push('/forgot-password')}
          style={styles.forgotBtn}
        >
          <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
        </TouchableOpacity>

        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={loading}
          size="lg"
          style={styles.submitBtn}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <Button
          title="Continue with Google"
          variant="outline"
          size="lg"
          icon={<Ionicons name="logo-google" size={18} color={colors.text} />}
          onPress={() => router.push('/google-signin')}
        />

        <View style={styles.footerRow}>
          <Text style={{ color: colors.textSecondary }}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 6 }}>
              Sign Up
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    marginBottom: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
});
