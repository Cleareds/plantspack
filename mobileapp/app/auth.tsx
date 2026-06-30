import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../src/lib/supabase';
import { track } from '../src/lib/analytics';
import { colors, spacing, typography, radius } from '../src/constants/theme';

WebBrowser.maybeCompleteAuthSession();

const APPLE_SIGNIN_ENABLED = true;

// Marks the one-time first-run sign-in gate as seen.
export const AUTH_GATE_KEY = 'pp_auth_gate_v1';

type Notice = { emoji: string; title: string; message: string };

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // `welcome=1` => this is the one-time first-run gate (pushed over the map).
  // Both signing in and "continue as guest" return to the app and mark the
  // gate seen. In normal in-app use (no param) it just dismisses, unchanged.
  const { welcome } = useLocalSearchParams<{ welcome?: string }>();
  const isWelcome = welcome === '1';
  const proceed = async () => {
    if (isWelcome) { try { await AsyncStorage.setItem(AUTH_GATE_KEY, '1'); } catch { /* non-fatal */ } }
    router.back();
  };

  // Apple Sign In is iOS-only and requires the Sign in with Apple capability.
  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) throw error;
        track('signed_in', { method: 'apple' });
        await proceed();
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign in failed', e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'plantspack' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success') {
          const params = new URLSearchParams(result.url.split('#')[1] || result.url.split('?')[1]);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            track('signed_in', { method: 'google' });
            await proceed();
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async () => {
    const e = email.trim().toLowerCase();
    if (!e || password.length < 6) {
      Alert.alert('Check your details', 'Enter your email and a password of at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: e, password });
        if (error) throw error;
        track('signed_in', { method: 'email' });
        await proceed();
      } else {
        const { data, error } = await supabase.auth.signUp({ email: e, password });
        if (error) throw error;
        track('signed_up', { method: 'email' });
        if (data.session) {
          await proceed(); // auto-confirm on
        } else {
          setNotice({ emoji: '📬', title: 'Confirm your email', message: `We sent a confirmation link to\n${e}` });
        }
      }
    } catch (err: any) {
      Alert.alert(mode === 'signin' ? 'Sign in failed' : 'Sign up failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    const e = email.trim().toLowerCase();
    if (!e) { Alert.alert('Enter your email', 'We need your email to send a link.'); return; }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: e,
        options: { emailRedirectTo: 'plantspack://auth/callback' },
      });
      if (error) throw error;
      setNotice({ emoji: '📬', title: 'Check your email', message: `We sent a magic link to\n${e}` });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (notice) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>{notice.emoji}</Text>
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.subtitle}>{notice.message}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setNotice(null)}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.dismissButton} onPress={proceed}>
          <Text style={styles.dismissText}>{isWelcome ? 'Skip for now' : 'Skip'}</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.logo}>🌱</Text>
          <Text style={styles.title}>{mode === 'signup' ? 'Join PlantsPack' : 'Welcome back'}</Text>
          {mode === 'signup' ? (
            <View style={styles.benefits}>
              {[
                { icon: 'heart' as const, text: 'Save your favourite vegan spots' },
                { icon: 'add-circle' as const, text: 'Add places & write reviews' },
                { icon: 'sparkles' as const, text: 'More AI scans — barcode, label & menu' },
                { icon: 'sync' as const, text: 'Sync across all your devices' },
              ].map((b) => (
                <View key={b.text} style={styles.benefitRow}>
                  <Ionicons name={b.icon} size={17} color={colors.primary} />
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.subtitle}>Welcome back — your places and scans are waiting</Text>
          )}

          {/* Apple Sign In (iOS only) */}
          {APPLE_SIGNIN_ENABLED && appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.md}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          {/* Google Sign In */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn} disabled={loading}>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {showEmailForm ? (
            <View style={styles.emailForm}>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'signup' ? 'password-new' : 'password'}
                textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              />
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handlePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                <Text style={styles.switchMode}>
                  {mode === 'signin' ? 'New to PlantsPack? Create an account' : 'Already have an account? Sign in'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleMagicLink} disabled={loading}>
                <Text style={styles.magicLink}>Email me a sign-in link instead</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowEmailForm(true)}>
              <Text style={styles.emailToggle}>Continue with email</Text>
            </TouchableOpacity>
          )}

          {isWelcome && (
            <TouchableOpacity style={styles.guestButton} onPress={proceed}>
              <Text style={styles.guestButtonText}>Continue as guest</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, paddingTop: 80 },
  dismissButton: { position: 'absolute', top: 60, right: spacing.lg, padding: spacing.sm, zIndex: 10 },
  dismissText: { color: colors.textSecondary, fontSize: typography.base },
  logo: { fontSize: 56, marginBottom: spacing.md },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  title: { fontSize: typography.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  benefits: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.xl, paddingHorizontal: spacing.sm },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitText: { fontSize: typography.base, color: colors.text, flex: 1 },
  appleButton: { width: '100%', height: 52, marginBottom: spacing.md },
  googleButton: {
    width: '100%', height: 52, backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  googleButtonText: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  divider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { paddingHorizontal: spacing.md, color: colors.textLight, fontSize: typography.sm },
  emailForm: { width: '100%', gap: spacing.md },
  input: {
    height: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, fontSize: typography.base, color: colors.text, backgroundColor: colors.backgroundSecondary,
  },
  primaryButton: { height: 52, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.white, fontSize: typography.base, fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
  switchMode: { color: colors.primary, fontSize: typography.base, textAlign: 'center', fontWeight: '500' },
  magicLink: { color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' },
  secondaryButton: { marginTop: spacing.xl, padding: spacing.md },
  secondaryButtonText: { color: colors.primary, fontSize: typography.base },
  emailToggle: { color: colors.primary, fontSize: typography.base, fontWeight: '500' },
  guestButton: {
    width: '100%',
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonText: { color: colors.textSecondary, fontSize: typography.base, fontWeight: '600' },
});
