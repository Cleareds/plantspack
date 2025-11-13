import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LoginForm } from '@/src/components/auth/LoginForm';
import { SignupForm } from '@/src/components/auth/SignupForm';
import { OAuthButtons } from '@/src/components/auth/OAuthButtons';
import { colors, spacing } from '@/src/constants/theme';

type AuthMode = 'login' | 'signup';

const { height } = Dimensions.get('window');

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />

      <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {/* You can add an actual logo image here */}
            <View style={styles.logoPlaceholder}>
              <View style={styles.leafIcon} />
            </View>
          </View>
        </View>

        {/* Forms */}
        <View style={styles.formWrapper}>
          {mode === 'login' ? (
            <>
              <LoginForm
                onSwitchToSignup={() => setMode('signup')}
              />
              <OAuthButtons />
            </>
          ) : (
            <>
              <SignupForm
                onSwitchToLogin={() => setMode('login')}
              />
              <OAuthButtons />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.text.inverse,
    borderRadius: 20,
  },
  formWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
});
