import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

// Mirrors the shared `notifications` table (see web/backend — do NOT change the
// schema, it's shared). actor is joined from `users` for social types only;
// system rows (submissions/corrections/nearby) have actor_id = null and the
// message is rendered verbatim.
export interface NotificationActor {
  id: string;
  username: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  actor?: NotificationActor | null;
}

// The `users!notifications_actor_id_fkey` join the web GET uses, so name/avatar
// resolve identically across platforms.
export const NOTIFICATION_SELECT = `
  id, user_id, actor_id, type, entity_type, entity_id, message, read, created_at,
  actor:users!notifications_actor_id_fkey ( id, username, avatar_url, first_name, last_name )
`;

type IconSpec = { name: keyof typeof Ionicons.glyphMap; color: string };

// One icon per known type. Unknown types fall back to a neutral bell so a new
// web-side type still renders rather than crashing.
const ICONS: Record<string, IconSpec> = {
  submission_approved: { name: 'checkmark-circle', color: colors.success },
  submission_received: { name: 'paper-plane', color: colors.primary },
  correction_approved: { name: 'create', color: colors.success },
  correction_received: { name: 'create-outline', color: colors.primary },
  place_nearby: { name: 'location', color: colors.primary },
  announcement: { name: 'megaphone', color: colors.primary },
  pack_update: { name: 'sparkles', color: colors.primary },
  like: { name: 'heart', color: colors.error },
  comment: { name: 'chatbubble', color: colors.primary },
  reply: { name: 'arrow-undo', color: colors.primary },
  follow: { name: 'person-add', color: colors.primary },
  mention: { name: 'at', color: colors.primary },
};

export function iconForType(type: string): IconSpec {
  return ICONS[type] ?? { name: 'notifications', color: colors.textSecondary };
}

// system messages have no actor — render `message` verbatim, no "Someone" prefix.
export function isSystemNotification(n: AppNotification): boolean {
  return !n.actor_id;
}

export function actorName(actor?: NotificationActor | null): string {
  if (!actor) return 'Someone';
  const full = [actor.first_name, actor.last_name].filter(Boolean).join(' ').trim();
  return full || actor.username || 'Someone';
}

// Social notifications are stored with a null message (the web renders their
// text client-side), so synthesize a readable line from the type. Place/system
// rows carry a real message and render it verbatim.
const SOCIAL_VERB: Record<string, string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  reply: 'replied to your comment',
  follow: 'started following you',
  mention: 'mentioned you',
};

export function notificationText(n: AppNotification): string {
  if (isSystemNotification(n)) return n.message || 'New notification';
  const name = actorName(n.actor);
  if (n.message) return `${name} ${n.message}`;
  const verb = SOCIAL_VERB[n.type];
  return verb ? `${name} ${verb}` : name;
}

// Deep-link target per the entity_type contract. Returns an expo-router href or
// null when the target has no mobile screen (posts/profiles live on web only) —
// callers still mark such rows read, they just don't navigate.
export function notificationLink(n: AppNotification): string | null {
  if (n.entity_type === 'place' && n.entity_id) {
    // place screen accepts a UUID or a slug in the [slug] segment.
    return `/place/${n.entity_id}`;
  }
  // 'post' and follow/profile targets have no mobile screen yet.
  return null;
}

// Compact relative time ("just now", "5m", "3h", "2d", "4w", or a date).
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (Number.isNaN(then) || diff < 0) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w`;
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
