import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('users').select('username').eq('id', user.id).maybeSingle().then(({ data }) => setUsername(data?.username ?? null));
  }, [user]);

  if (!user) { router.replace('/auth'); return null; }

  // Account deletion + data export run through the tested web flow (it re-auths
  // and does full data cleanup). We open it in an in-app browser.
  const settingsUrl = username
    ? `https://plantspack.com/profile/${encodeURIComponent(username)}/settings`
    : 'https://plantspack.com/settings';

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { signOut(); router.back(); } },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete account',
      'This permanently removes your account and data. You’ll finish on the secure web page.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => WebBrowser.openBrowserAsync(`${settingsUrl}#delete-account`) },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={22} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Account</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>Signed in as</Text>
        <View style={styles.emailCard}>
          <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.group}>
          <Row icon="download-outline" label="Export my data" onPress={() => WebBrowser.openBrowserAsync(`${settingsUrl}#export-data`)} />
          <Row icon="open-outline" label="Manage account on web" onPress={() => WebBrowser.openBrowserAsync(settingsUrl)} />
        </View>

        <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.delete} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.text} style={{ marginRight: spacing.md }} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 4 },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  body: { padding: spacing.md },
  sectionLabel: { fontSize: typography.sm, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  emailCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.backgroundSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  email: { fontSize: typography.base, color: colors.text },
  group: { marginTop: spacing.lg, backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { flex: 1, fontSize: typography.base, color: colors.text },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.error + '40', backgroundColor: colors.error + '08' },
  signOutText: { color: colors.error, fontSize: typography.base, fontWeight: '600' },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, padding: spacing.sm },
  deleteText: { color: colors.error, fontSize: typography.sm, fontWeight: '500' },
});
