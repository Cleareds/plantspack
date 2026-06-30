import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

interface Submission { id: string; name: string; city: string | null; country: string | null; status: string; created_at: string; imported_place_id: string | null }
interface Review { id: string; rating: number; content: string | null; created_at: string; place: { name: string; slug: string } | null }

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending review', color: '#b45309', bg: '#fef3c7' },
  approved: { label: 'Live', color: '#15803d', bg: '#dcfce7' },
  rejected: { label: 'Not added', color: '#b91c1c', bg: '#fee2e2' },
};

export default function ContributionsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const [s, r] = await Promise.all([
        supabase.from('place_submissions').select('id, name, city, country, status, created_at, imported_place_id').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('place_reviews').select('id, rating, content, created_at, place:places(name, slug)').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setSubs((s.data ?? []) as Submission[]);
      setReviews((r.data ?? []) as any);
      setLoading(false);
    })();
  }, [user]);

  if (!user) { router.replace('/auth'); return null; }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={22} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>My contributions</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.statsRow}>
            <Stat n={subs.length} label="Places suggested" />
            <Stat n={subs.filter((s) => s.status === 'approved').length} label="Now live" />
            <Stat n={reviews.length} label="Reviews" />
          </View>

          <Text style={styles.sectionLabel}>Places you suggested</Text>
          {subs.length === 0 ? (
            <EmptyRow icon="add-circle-outline" text="You haven't suggested any places yet." cta="Suggest a place" onPress={() => router.push('/suggest-place')} />
          ) : subs.map((s) => {
            const st = STATUS_STYLE[s.status] ?? STATUS_STYLE.pending;
            const row = (
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{s.name}</Text>
                {(s.city || s.country) && <Text style={styles.itemSub}>{[s.city, s.country].filter(Boolean).join(', ')}</Text>}
              </View>
            );
            return (
              <View key={s.id} style={styles.item}>
                {row}
                <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text></View>
              </View>
            );
          })}

          <Text style={styles.sectionLabel}>Your reviews</Text>
          {reviews.length === 0 ? (
            <EmptyRow icon="star-outline" text="You haven't written any reviews yet." />
          ) : reviews.map((rv) => (
            <TouchableOpacity key={rv.id} style={styles.item} disabled={!rv.place} onPress={() => rv.place && router.push({ pathname: '/place/[slug]', params: { slug: rv.place.slug } })}>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{rv.place?.name ?? 'A place'}</Text>
                {rv.content ? <Text style={styles.itemSub} numberOfLines={1}>{rv.content}</Text> : null}
              </View>
              <View style={styles.ratingPill}><Ionicons name="star" size={12} color="#f59e0b" /><Text style={styles.ratingText}>{rv.rating}</Text></View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statN}>{n}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function EmptyRow({ icon, text, cta, onPress }: { icon: any; text: string; cta?: string; onPress?: () => void }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={32} color={colors.textLight} />
      <Text style={styles.emptyText}>{text}</Text>
      {cta && onPress ? <TouchableOpacity style={styles.emptyBtn} onPress={onPress}><Text style={styles.emptyBtnText}>{cta}</Text></TouchableOpacity> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 4 },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  body: { padding: spacing.md, paddingBottom: spacing.xxl },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' },
  statN: { fontSize: typography.xl, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: typography.xs, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
  sectionLabel: { fontSize: typography.md, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemText: { flex: 1 },
  itemTitle: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  itemSub: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: typography.xs, fontWeight: '700' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  ratingText: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyText: { fontSize: typography.sm, color: colors.textSecondary },
  emptyBtn: { paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.primary },
  emptyBtnText: { color: colors.primary, fontWeight: '700', fontSize: typography.sm },
});
