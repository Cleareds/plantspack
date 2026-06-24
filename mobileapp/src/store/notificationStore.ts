import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Only show rows targeted at this device's channel. NULL = all channels (every
// transactional notification + untargeted broadcast); admin can also target a
// broadcast to web-only / ios-only / android-only, which we then hide here.
export const CHANNEL_FILTER = `channels.is.null,channels.cs.{${Platform.OS}}`;

// Keep the OS app-icon badge in lockstep with the in-app unread count.
// Best-effort: iOS honours it directly; Android depends on the launcher.
function setOsBadge(n: number) {
  Notifications.setBadgeCountAsync(Math.max(0, n)).catch(() => {});
}

// Holds the tab-bar unread badge count and a single realtime subscription so
// the badge updates without a manual refresh. The list screen owns its own
// paginated query; it calls back into here to keep the count in sync.
interface NotificationStore {
  unreadCount: number;
  channel: RealtimeChannel | null;
  setUnreadCount: (n: number) => void;
  refreshUnread: (userId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  subscribe: (userId: string) => void;
  unsubscribe: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  unreadCount: 0,
  channel: null,

  setUnreadCount: (n) => { const v = Math.max(0, n); set({ unreadCount: v }); setOsBadge(v); },

  refreshUnread: async (userId) => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
      .or(CHANNEL_FILTER);
    const v = count ?? 0;
    set({ unreadCount: v });
    setOsBadge(v);
  },

  markAllRead: async (userId) => {
    set({ unreadCount: 0 });
    setOsBadge(0);
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
      .or(CHANNEL_FILTER);
  },

  // Realtime: any insert/update on this user's rows just re-counts unread. A
  // recount is cheap (indexed head count) and avoids tracking per-row state.
  subscribe: (userId) => {
    if (get().channel) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { get().refreshUnread(userId); }
      )
      .subscribe();
    set({ channel });
  },

  unsubscribe: () => {
    const ch = get().channel;
    if (ch) supabase.removeChannel(ch);
    set({ channel: null, unreadCount: 0 });
    setOsBadge(0);
  },
}));
