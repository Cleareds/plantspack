import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { colors, spacing, typography, borderRadius } from '@/src/constants/theme';
import { TierBadge } from '@/src/components/ui/TierBadge';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuthStore();

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/auth');
          } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  const SettingsItem = ({
    icon,
    label,
    onPress,
    rightText,
    rightComponent,
    disabled,
  }: {
    icon: string;
    label: string;
    onPress?: () => void;
    rightText?: string;
    rightComponent?: React.ReactNode;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingsItem, disabled && styles.settingsItemDisabled]}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      <View style={styles.settingsItemLeft}>
        <Ionicons name={icon as any} size={22} color={colors.gray[600]} />
        <Text style={styles.settingsItemLabel}>{label}</Text>
      </View>
      <View style={styles.settingsItemRight}>
        {rightText && <Text style={styles.settingsItemRightText}>{rightText}</Text>}
        {rightComponent}
        {onPress && <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.card}>
          <SettingsItem
            icon="person-outline"
            label="Username"
            rightText={`@${profile?.username || 'N/A'}`}
          />
          <SettingsItem
            icon="mail-outline"
            label="Email"
            rightText={user?.email || 'N/A'}
          />
          <SettingsItem
            icon="star-outline"
            label="Subscription"
            rightComponent={
              <TierBadge tier={profile?.subscription_tier || 'free'} size="sm" />
            }
            onPress={() => Alert.alert('Upgrade', 'Visit plantspack.com to upgrade your subscription')}
          />
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.card}>
          <SettingsItem
            icon="notifications-outline"
            label="Notifications"
            rightText="Coming Soon"
            disabled
          />
          <SettingsItem
            icon="lock-closed-outline"
            label="Privacy"
            rightText="Coming Soon"
            disabled
          />
          <SettingsItem
            icon="color-palette-outline"
            label="Theme"
            rightText="System Default"
            disabled
          />
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.card}>
          <SettingsItem
            icon="information-circle-outline"
            label="Version"
            rightText="1.0.0"
          />
          <SettingsItem
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => Alert.alert('Terms', 'Visit plantspack.com/terms')}
          />
          <SettingsItem
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => Alert.alert('Privacy', 'Visit plantspack.com/privacy')}
          />
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>PlantsPack v1.0.0</Text>
        <Text style={styles.footerSubtext}>Made with 💚 for the plant-based community</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  section: {
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    paddingHorizontal: spacing[2],
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingsItemDisabled: {
    opacity: 0.5,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  settingsItemLabel: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  settingsItemRightText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginTop: spacing[6],
    paddingVertical: spacing[4],
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.danger,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginBottom: spacing[1],
  },
  footerSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
});
