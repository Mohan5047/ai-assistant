import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Header } from '../src/components/ui/Header';

export default function GoogleSignInScreen() {
  const { loginWithGoogle } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [idToken, setIdToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!idToken.trim()) {
      setError('Please provide a Google ID Token or use standard sign in.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(idToken.trim());
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Google Sign-In" canGoBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.centerBox}>
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="logo-google" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>OAuth Authentication</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            On mobile, Google OAuth exchanges an authenticated ID token with the backend securely.
          </Text>
        </View>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2', borderColor: colors.danger }]}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <Input
          label="Google ID Token"
          placeholder="Paste OAuth id_token here"
          multiline
          numberOfLines={4}
          value={idToken}
          onChangeText={setIdToken}
          style={{ height: 90, textAlignVertical: 'top' }}
        />

        <Button
          title="Authenticate with Google Token"
          onPress={handleSignIn}
          loading={loading}
          size="lg"
          style={{ marginTop: 8 }}
        />

        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => router.back()}
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
    padding: 24,
  },
  centerBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
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
});
