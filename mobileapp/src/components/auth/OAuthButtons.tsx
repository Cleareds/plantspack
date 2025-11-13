import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/authStore';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/constants/theme';

interface OAuthButtonsProps {
  onSuccess?: () => void;
}

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({ onSuccess }) => {
  const { signInWithGoogle, signInWithFacebook, loading } = useAuthStore();
  const [loadingProvider, setLoadingProvider] = React.useState<'google' | 'facebook' | null>(null);

  const handleGoogleSignIn = async () => {
    setLoadingProvider('google');
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (error: any) {
      console.error('Google sign in error:', error);
      Alert.alert(
        'Sign In Failed',
        'Failed to sign in with Google. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleFacebookSignIn = async () => {
    setLoadingProvider('facebook');
    try {
      await signInWithFacebook();
      onSuccess?.();
    } catch (error: any) {
      console.error('Facebook sign in error:', error);
      Alert.alert(
        'Sign In Failed',
        'Failed to sign in with Facebook. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.oauthButton, styles.googleButton]}
        onPress={handleGoogleSignIn}
        disabled={loading || loadingProvider !== null}
        activeOpacity={0.7}
      >
        {loadingProvider === 'google' ? (
          <ActivityIndicator size="small" color={colors.text.primary} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={colors.text.primary} />
            <Text style={[styles.oauthButtonText, styles.googleButtonText]}>
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.oauthButton, styles.facebookButton]}
        onPress={handleFacebookSignIn}
        disabled={loading || loadingProvider !== null}
        activeOpacity={0.7}
      >
        {loadingProvider === 'facebook' ? (
          <ActivityIndicator size="small" color={colors.text.inverse} />
        ) : (
          <>
            <Ionicons name="logo-facebook" size={20} color={colors.text.inverse} />
            <Text style={[styles.oauthButtonText, styles.facebookButtonText]}>
              Continue with Facebook
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: spacing[4],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    marginHorizontal: spacing[4],
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.base,
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  oauthButtonText: {
    marginLeft: spacing[3],
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  googleButton: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  googleButtonText: {
    color: colors.text.primary,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  facebookButtonText: {
    color: colors.text.inverse,
  },
});
