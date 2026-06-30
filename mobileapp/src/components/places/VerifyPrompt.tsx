import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { AuthPromptModal } from '../ui/AuthPromptModal';
import { reportPlace, ReportType } from '../../lib/placeReports';
import { colors, spacing, radius, typography } from '../../constants/theme';

interface VerifyPromptProps {
  placeId: string;
  veganLevel: string | null;
  verificationMethod: string | null;
  verificationLevel: number | null;
  isVerified: boolean | null;
  tags: string[] | null;
}

function getBadge(method: string | null, level: number | null, isVerified: boolean | null, tags: string[]) {
  const communityConfirmed =
    isVerified === true ||
    // Exclude `community_report:*` pending flags — those are unreviewed reports,
    // not confirmations, and would otherwise substring-match below.
    tags.some((t) => !t.startsWith('community_report:') && /actually_fully_vegan|community_correction_confirmed/.test(t));
  if (communityConfirmed) return { icon: 'checkmark-circle' as const, color: colors.success, label: 'Confirmed by the community' };
  if (method === 'admin_review') return { icon: 'checkmark-circle' as const, color: colors.success, label: 'Admin-reviewed' };
  if (method === 'ai_verified') return { icon: 'sparkles' as const, color: '#7c3aed', label: 'AI-verified' };
  if ((level ?? 0) >= 3) return { icon: 'server-outline' as const, color: colors.textSecondary, label: 'Cross-referenced across vegan-first sources' };
  if ((level ?? 0) >= 1) return { icon: 'server-outline' as const, color: colors.textSecondary, label: 'Sourced from a vegan-first dataset' };
  return { icon: 'alert-circle-outline' as const, color: colors.warning, label: 'Imported, not yet confirmed' };
}

type Action = { type: ReportType; label: string; icon: any };

const BASE_ACTIONS: Action[] = [
  { type: 'confirmed', label: 'Looks correct', icon: 'checkmark' },
  { type: 'permanently_closed', label: 'Permanently closed', icon: 'close' },
  { type: 'hours_wrong', label: 'Hours changed', icon: 'time-outline' },
];

export function VerifyPrompt({ placeId, veganLevel, verificationMethod, verificationLevel, isVerified, tags }: VerifyPromptProps) {
  const { user } = useAuthStore();
  const tagList = tags ?? [];
  const isFullyVegan = veganLevel === 'fully_vegan';
  // Surface the vegan-level correction that matches the current state: only one
  // direction is actionable per place.
  const actions: Action[] = [
    ...BASE_ACTIONS,
    isFullyVegan
      ? { type: 'not_fully_vegan', label: 'Not 100% vegan', icon: 'alert' }
      : { type: 'actually_fully_vegan', label: "It's 100% vegan", icon: 'leaf' },
  ];
  const badge = getBadge(verificationMethod, verificationLevel, isVerified, tagList);
  const pendingReport = tagList.some((t) => t.startsWith('community_report:'));

  const [submitting, setSubmitting] = useState<ReportType | null>(null);
  const [done, setDone] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const submit = async (type: ReportType) => {
    if (!user) { setShowAuth(true); return; }
    setSubmitting(type);
    try {
      await reportPlace(placeId, type);
      setDone(true);
    } catch (e: any) {
      Alert.alert('Could not submit', e.message);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.badgeRow}>
        <Ionicons name={badge.icon} size={16} color={badge.color} />
        <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
      </View>
      {pendingReport && !done && (
        <Text style={styles.pending}>A community member flagged something to check. Pending review.</Text>
      )}

      {done ? (
        <View style={styles.thanks}>
          <Ionicons name="heart" size={16} color={colors.primary} />
          <Text style={styles.thanksText}>Thanks! Submitted for review.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.prompt}>Been here? Help keep this accurate.</Text>
          <View style={styles.actions}>
            {actions.map((a) => (
              <TouchableOpacity
                key={a.type}
                style={[styles.chip, a.type === 'confirmed' && styles.chipPrimary]}
                onPress={() => submit(a.type)}
                disabled={submitting !== null}
                accessibilityRole="button"
                accessibilityLabel={a.label}
              >
                {submitting === a.type ? (
                  <ActivityIndicator size="small" color={a.type === 'confirmed' ? colors.white : colors.primary} />
                ) : (
                  <>
                    <Ionicons name={a.icon} size={14} color={a.type === 'confirmed' ? colors.white : colors.text} />
                    <Text style={[styles.chipText, a.type === 'confirmed' && styles.chipTextPrimary]}>{a.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <AuthPromptModal
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        title="Sign in to help verify"
        message="Create a free account to confirm details and help the community keep listings accurate."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeLabel: { fontSize: typography.sm, fontWeight: '600', flex: 1 },
  pending: { fontSize: typography.sm, color: colors.warning },
  prompt: { fontSize: typography.sm, color: colors.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background,
  },
  chipPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  chipTextPrimary: { color: colors.white },
  thanks: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  thanksText: { fontSize: typography.base, color: colors.text, fontWeight: '500' },
});
