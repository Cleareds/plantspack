import { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Share, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useSavedPlaces } from '../../src/hooks/useSavedPlaces';
import { useFollowedCities } from '../../src/hooks/useFollowedCities';
import { PlaceCard } from '../../src/components/places/PlaceCard';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

const QUICK_TOOLS = [
  { icon: 'restaurant-outline' as const, label: 'Menu', route: '/tools/menu-scanner', color: '#db2777' },
  { icon: 'barcode-outline' as const, label: 'Barcode', route: '/tools/barcode', color: '#7c3aed' },
  { icon: 'camera-outline' as const, label: 'Label', route: '/tools/ingredient-scanner', color: '#0891b2' },
  { icon: 'wine-outline' as const, label: 'Drinks', route: '/tools/drinks', color: '#b45309' },
];

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const { places: saved, refetch: refetchSaved } = useSavedPlaces();
  const { cities, refetch: refetchCities } = useFollowedCities();

  useFocusEffect(useCallback(() => { refetchSaved(); refetchCities(); }, [refetchSaved, refetchCities]));

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };
  const handleShare = () => {
    Share.share({ message: 'Find vegan places, tools and more on PlantsPack: https://plantspack.com' });
  };
  const rateApp = () => {
    const url = Platform.select({
      ios: 'itms-apps://apps.apple.com/app/id6779618901?action=write-review',
      android: 'market://details?id=plantspack.app',
    });
    const web = Platform.select({
      ios: 'https://apps.apple.com/app/id6779618901',
      android: 'https://play.google.com/store/apps/details?id=plantspack.app',
    });
    Linking.openURL(url!).catch(() => Linking.openURL(web!));
  };
  const reportProblem = () => {
    const subject = encodeURIComponent('PlantsPack app feedback');
    const body = encodeURIComponent(`\n\n---\nApp v1.0.0 · ${Platform.OS} ${Platform.Version}\n(Tell us what happened, and a screenshot helps!)`);
    Linking.openURL(`mailto:hello@plantspack.com?subject=${subject}&body=${body}`)
      .catch(() => Linking.openURL('https://plantspack.com/contact'));
  };

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.guestState}>
          <Ionicons name="person-circle-outline" size={80} color={colors.textLight} />
          <Text style={styles.guestTitle}>Your profile</Text>
          <Text style={styles.guestText}>
            Sign in to save places, pin your cities, unlock unlimited scans, and sync across devices.
          </Text>
          <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/auth')}>
            <Text style={styles.signInText}>Sign up - it's free</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/auth')}>
            <Text style={styles.loginLink}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Vegan Explorer';
  const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.profileHeader}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{displayName[0].toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
          {user.email ? <Text style={styles.email} numberOfLines={1}>{user.email}</Text> : null}
        </View>
      </View>

      {/* Your cities */}
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Your cities</Text>
        {cities.length === 0 ? (
          <Text style={styles.hint}>Open a city and tap the bookmark to pin it here for quick access.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {cities.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.cityChip}
                onPress={() => router.push({ pathname: '/browse/city', params: { country: c.country, city: c.city } })}
              >
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={styles.cityChipText} numberOfLines={1}>{c.city}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Quick tools */}
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Quick tools</Text>
        <View style={styles.toolRow}>
          {QUICK_TOOLS.map((t) => (
            <TouchableOpacity key={t.route} style={styles.toolItem} onPress={() => router.push(t.route as any)}>
              <View style={[styles.toolIcon, { backgroundColor: t.color + '18' }]}>
                <Ionicons name={t.icon} size={22} color={t.color} />
              </View>
              <Text style={styles.toolLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.toolItem} onPress={() => router.push('/tools')}>
            <View style={[styles.toolIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
            </View>
            <Text style={styles.toolLabel}>All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Saved */}
      <View style={styles.block}>
        <View style={styles.blockHeaderRow}>
          <Text style={styles.blockTitle}>Saved places</Text>
          {saved.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/saved')}>
              <Text style={styles.seeAll}>See all ({saved.length})</Text>
            </TouchableOpacity>
          )}
        </View>
        {saved.length === 0 ? (
          <Text style={styles.hint}>Tap the heart on any place to save it here.</Text>
        ) : (
          saved.slice(0, 4).map((p) => <PlaceCard key={p.id} place={p} />)
        )}
      </View>

      {/* Account & settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <SettingsRow icon="person-outline" label="Edit profile" onPress={() => router.push('/profile/edit')} />
        <SettingsRow icon="options-outline" label="Preferences" onPress={() => router.push('/profile/preferences')} />
        <SettingsRow icon="heart-outline" label="Saved places" onPress={() => router.push('/saved')} />
        <SettingsRow icon="ribbon-outline" label="My contributions" onPress={() => router.push('/profile/contributions')} />
        <SettingsRow icon="settings-outline" label="Account & privacy" onPress={() => router.push('/profile/account')} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contribute & support</Text>
        <SettingsRow icon="add-circle-outline" label="Suggest a place" onPress={() => router.push('/suggest-place')} />
        <SettingsRow icon="star-outline" label="Rate PlantsPack" onPress={rateApp} />
        <SettingsRow icon="share-outline" label="Share with friends" onPress={handleShare} />
        <SettingsRow icon="chatbubble-ellipses-outline" label="Report a problem / Contact us" onPress={reportProblem} />
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>PlantsPack v1.0</Text>
    </ScrollView>
  );
}

function SettingsRow({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.text} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 80 },
  profileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 24, fontWeight: '700', color: colors.primary },
  headerText: { flex: 1 },
  displayName: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  email: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 1 },

  block: { paddingTop: spacing.lg, paddingHorizontal: spacing.md },
  blockHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  seeAll: { fontSize: typography.sm, color: colors.primary, fontWeight: '600' },
  hint: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 19 },
  chipRow: { gap: 8, paddingVertical: 2 },
  cityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 9,
    backgroundColor: colors.backgroundSecondary, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, maxWidth: 180,
  },
  cityChipText: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  toolRow: { flexDirection: 'row', justifyContent: 'space-between' },
  toolItem: { alignItems: 'center', gap: 6, width: 60 },
  toolIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: typography.xs, color: colors.textSecondary, fontWeight: '600' },

  section: {
    marginTop: spacing.lg, marginHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: typography.sm, fontWeight: '700', color: colors.textSecondary,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 6,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  rowIcon: { marginRight: spacing.md },
  rowLabel: { flex: 1, fontSize: typography.base, color: colors.text },

  guestState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  guestTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  guestText: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  signInButton: { marginTop: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: 12 },
  signInText: { color: colors.white, fontWeight: '600', fontSize: typography.base },
  loginLink: { color: colors.primary, fontSize: typography.base },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: spacing.xl, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.error + '40', backgroundColor: colors.error + '08',
  },
  signOutText: { color: colors.error, fontSize: typography.base, fontWeight: '600' },
  version: { textAlign: 'center', color: colors.textLight, fontSize: typography.sm, marginBottom: spacing.lg },
});
