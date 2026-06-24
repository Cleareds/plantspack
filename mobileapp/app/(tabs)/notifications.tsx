import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useNotificationStore, CHANNEL_FILTER } from '../../src/store/notificationStore';
import { useFollowedCities } from '../../src/hooks/useFollowedCities';
import { supabase } from '../../src/lib/supabase';
import {
  AppNotification, NOTIFICATION_SELECT, iconForType, isSystemNotification,
  notificationText, notificationLink, relativeTime, actorName,
} from '../../src/lib/notifications';
import { colors, spacing, typography, radius } from '../../src/constants/theme';

const PAGE_SIZE = 20;

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { unreadCount, refreshUnread, markAllRead, setUnreadCount } = useNotificationStore();
  const { cities } = useFollowedCities();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (from: number): Promise<AppNotification[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select(NOTIFICATION_SELECT)
      .eq('user_id', user.id)
      .or(CHANNEL_FILTER)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return [];
    return (data as unknown as AppNotification[]) ?? [];
  }, [user]);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const first = await fetchPage(0);
    setItems(first);
    setHasMore(first.length === PAGE_SIZE);
    setLoading(false);
    refreshUnread(user.id);
  }, [user, fetchPage, refreshUnread]);

  // Refresh on focus.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // When realtime bumps the badge UP while this screen is open, a new
  // notification arrived — re-pull the top of the list. A drop (mark-read)
  // must NOT reload, or it would clobber the optimistic read state on tap.
  const prevUnread = useRef(unreadCount);
  useEffect(() => {
    if (user && unreadCount > prevUnread.current) load();
    prevUnread.current = unreadCount;
  }, [unreadCount, user, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const first = await fetchPage(0);
    setItems(first);
    setHasMore(first.length === PAGE_SIZE);
    if (user) refreshUnread(user.id);
    setRefreshing(false);
  }, [fetchPage, refreshUnread, user]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const next = await fetchPage(items.length);
    setItems((prev) => [...prev, ...next]);
    setHasMore(next.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, loading, fetchPage, items.length]);

  const handlePress = useCallback(async (n: AppNotification) => {
    // Optimistically clear the unread dot + badge, then route. Marking read is
    // best-effort; RLS only lets a user touch their own rows.
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount(unreadCount - 1);
      supabase.from('notifications').update({ read: true }).eq('id', n.id).then(() => {});
    }
    const href = notificationLink(n);
    if (href) router.push(href as any);
  }, [unreadCount, setUnreadCount]);

  const handleMarkAll = useCallback(async () => {
    if (!user) return;
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    await markAllRead(user.id);
  }, [user, markAllRead]);

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}><Text style={styles.title}>Notifications</Text></View>
        <View style={styles.centerState}>
          <Ionicons name="notifications-outline" size={64} color={colors.textLight} />
          <Text style={styles.stateTitle}>Stay in the loop</Text>
          <Text style={styles.stateText}>Sign in to see when your suggestions go live and when new vegan spots open near you.</Text>
          <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/auth')}>
            <Text style={styles.signInText}>Sign up — it&apos;s free</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAll} style={styles.markAll} accessibilityLabel="Mark all as read">
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {cities.length === 0 && (
        <TouchableOpacity style={styles.cityCta} onPress={() => router.push('/follow-city')} accessibilityRole="button">
          <Ionicons name="location" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cityCtaTitle}>Pin your city</Text>
            <Text style={styles.cityCtaText}>Get notified when a new vegan spot opens near you.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </TouchableOpacity>
      )}

      {loading && items.length === 0 && <ActivityIndicator style={styles.loader} color={colors.primary} />}

      {!loading && items.length === 0 && (
        <View style={styles.centerState}>
          <Ionicons name="notifications-outline" size={56} color={colors.textLight} />
          <Text style={styles.stateTitle}>Nothing yet</Text>
          <Text style={styles.stateText}>We&apos;ll let you know when your suggestions go live or a new vegan spot opens nearby.</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationRow n={item} onPress={handlePress} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: spacing.md }} color={colors.primary} /> : null}
      />
    </View>
  );
}

function NotificationRow({ n, onPress }: { n: AppNotification; onPress: (n: AppNotification) => void }) {
  const system = isSystemNotification(n);
  const icon = iconForType(n.type);
  const tappable = !!notificationLink(n);

  return (
    <TouchableOpacity
      style={[styles.row, !n.read && styles.rowUnread]}
      onPress={() => onPress(n)}
      activeOpacity={tappable ? 0.6 : 0.9}
      accessibilityLabel={notificationText(n)}
    >
      {/* System rows: type icon in a tinted circle. Social rows: actor avatar. */}
      {system || !n.actor?.avatar_url ? (
        <View style={[styles.iconCircle, { backgroundColor: icon.color + '1a' }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
      ) : (
        <Image source={{ uri: n.actor.avatar_url }} style={styles.avatar} accessibilityLabel={actorName(n.actor)} />
      )}

      <View style={styles.rowBody}>
        <Text style={styles.rowText} numberOfLines={3}>{notificationText(n)}</Text>
        <Text style={styles.rowTime}>{relativeTime(n.created_at)}</Text>
      </View>

      {!n.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  markAll: { paddingVertical: 4, paddingHorizontal: 6 },
  markAllText: { color: colors.primary, fontWeight: '600', fontSize: typography.sm },
  cityCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primaryLight + '55', borderWidth: 1, borderColor: colors.border },
  cityCtaTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  cityCtaText: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 1, lineHeight: 17 },
  list: { paddingBottom: 40 },
  loader: { marginTop: spacing.xl },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowUnread: { backgroundColor: colors.primaryLight + '40' },
  iconCircle: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.backgroundSecondary },
  rowBody: { flex: 1, gap: 2 },
  rowText: { fontSize: typography.base, color: colors.text, lineHeight: 20 },
  rowTime: { fontSize: typography.xs, color: colors.textLight },
  unreadDot: { width: 9, height: 9, borderRadius: radius.full, backgroundColor: colors.primary },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  stateTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  stateText: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  signInButton: { marginTop: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: 12 },
  signInText: { color: colors.white, fontWeight: '600', fontSize: typography.base },
});
