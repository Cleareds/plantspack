import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useFilterStore } from '../../src/store/filterStore';
import { fetchPreferences, savePreferences, ALLERGEN_OPTIONS, UserPreferences, VeganLevelPref } from '../../src/lib/preferences';
import { registerForPush } from '../../src/lib/push';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

const VEGAN_LEVELS: { value: Exclude<VeganLevelPref, null>; label: string }[] = [
  { value: 'fully_vegan', label: '100% Vegan only' },
  { value: 'mostly_vegan', label: 'Mostly Vegan' },
  { value: 'vegan_friendly', label: 'Vegan-Friendly' },
  { value: 'vegan_options', label: 'Has Options' },
];

export default function PreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const applyPreferences = useFilterStore((s) => s.applyPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchPreferences().then((p) => { setPrefs(p); setLoading(false); });
  }, [user]);

  if (!user) { router.replace('/auth'); return null; }

  const update = (patch: Partial<UserPreferences>) => setPrefs((p) => (p ? { ...p, ...patch } : p));
  const toggleAllergen = (a: string) =>
    setPrefs((p) => p ? { ...p, allergens: p.allergens.includes(a) ? p.allergens.filter((x) => x !== a) : [...p.allergens, a] } : p);

  // Enabling push is the contextual moment to request the OS permission (iOS
  // only ever shows it once). If the user previously denied it, the in-app
  // toggle can't re-enable it — route them to Settings instead.
  const onTogglePush = async (v: boolean) => {
    if (!v) { update({ push_notifications: false, push_announcements: false }); return; }
    if (!user) return;
    const status = await registerForPush(user.id, { prompt: true });
    if (status === 'denied') {
      Alert.alert(
        'Turn on notifications',
        'Notifications are turned off for PlantsPack in your device settings. Open Settings to enable them.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return; // leave the toggle off — OS permission wins
    }
    update({ push_notifications: true });
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    const { error } = await savePreferences(prefs);
    setSaving(false);
    if (error) { Alert.alert('Could not save', error); return; }
    // Re-assert the token if push is on (no prompt — already handled at toggle).
    if (prefs.push_notifications && user) registerForPush(user.id);
    // Apply the prefs that drive the UI immediately.
    applyPreferences({ default_vegan_level: prefs.default_vegan_level, distance_unit: prefs.distance_unit });
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={22} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Preferences</Text>
      </View>

      {loading || !prefs ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.sectionLabel}>Default map view</Text>
          <Text style={styles.hint}>What you see first on the map and in search.</Text>
          <View style={styles.chips}>
            {VEGAN_LEVELS.map((v) => (
              <Chip key={v.value} label={v.label} active={prefs.default_vegan_level === v.value} onPress={() => update({ default_vegan_level: prefs.default_vegan_level === v.value ? null : v.value })} />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Allergens to avoid</Text>
          <Text style={styles.hint}>Scanners and menu checks flag these alongside animal products.</Text>
          <View style={styles.chips}>
            {ALLERGEN_OPTIONS.map((a) => (
              <Chip key={a} label={a[0].toUpperCase() + a.slice(1)} active={prefs.allergens.includes(a)} onPress={() => toggleAllergen(a)} />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Distance unit</Text>
          <View style={styles.segment}>
            {(['km', 'mi'] as const).map((u) => (
              <TouchableOpacity key={u} style={[styles.segBtn, prefs.distance_unit === u && styles.segActive]} onPress={() => update({ distance_unit: u })}>
                <Text style={[styles.segText, prefs.distance_unit === u && styles.segTextActive]}>{u === 'km' ? 'Kilometres' : 'Miles'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Theme</Text>
          <View style={styles.segment}>
            {(['system', 'light', 'dark'] as const).map((t) => (
              <TouchableOpacity key={t} style={[styles.segBtn, prefs.theme === t && styles.segActive]} onPress={() => update({ theme: t })}>
                <Text style={[styles.segText, prefs.theme === t && styles.segTextActive]}>{t[0].toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.note}>Dark theme is saved to your account and applies as we roll out theming.</Text>

          <Text style={styles.sectionLabel}>Notifications</Text>
          <Text style={styles.hint}>You always see updates in the in-app bell. These control device push.</Text>
          <ToggleRow
            label="Push notifications"
            sub="Replies, your suggestions going live, and nearby spots."
            value={prefs.push_notifications}
            onValueChange={onTogglePush}
          />
          <ToggleRow
            label="Announcements & tips"
            sub="Occasional product news from PlantsPack. Off by default — opt in any time."
            value={prefs.push_announcements}
            disabled={!prefs.push_notifications}
            onValueChange={(v) => update({ push_announcements: v })}
          />

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>Save preferences</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({ label, sub, value, onValueChange, disabled }: {
  label: string; sub: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, disabled && { opacity: 0.5 }]}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 4 },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  body: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionLabel: { fontSize: typography.md, fontWeight: '700', color: colors.text, marginTop: spacing.lg },
  hint: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  segment: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  segBtn: { flex: 1, paddingVertical: 11, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.background },
  segActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  segTextActive: { color: colors.white },
  note: { fontSize: typography.xs, color: colors.textLight, marginTop: spacing.sm, lineHeight: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.xs },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  toggleSub: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 15, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.xl },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: typography.md },
});
