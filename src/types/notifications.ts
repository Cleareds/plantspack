export type NotificationType =
  | 'like' | 'comment' | 'follow' | 'mention' | 'reply' | 'repost' | 'pack_update'
  // Place submission / correction lifecycle + nearby-place alerts. These are
  // also what the mobile app will read in its next build.
  | 'submission_received' | 'submission_approved'
  | 'correction_received' | 'correction_approved' | 'correction_dismissed'
  // Community vegan/closure report lifecycle: reviewed = we acted on it,
  // dismissed = we checked and kept the listing as-is (rare).
  | 'report_reviewed' | 'report_dismissed'
  // New community report, sent to the admin account (DB trigger notify_report).
  | 'report_received'
  | 'place_nearby'
  // Admin broadcast to all users (in-app bell for everyone; OS push only to
  // users who opted in via user_preferences.push_announcements).
  | 'announcement'
  // A Partner venue's monthly message to the people who follow its city.
  | 'venue_update'
export type NotificationEntityType = 'post' | 'comment' | 'place' | 'user' | 'place_review' | 'report'

export interface Notification {
  id: string
  user_id: string
  actor_id: string | null
  type: NotificationType
  entity_type: NotificationEntityType | null
  entity_id: string | null
  message: string | null
  read: boolean
  created_at: string
  // Target channels; NULL = all. Subset of {web,ios,android}. Used to scope
  // admin broadcasts to specific surfaces.
  channels?: string[] | null
  // Optional tap target (admin broadcasts). See src/lib/notifications/link.ts.
  url?: string | null
  actor?: {
    id: string
    username: string
    avatar_url: string | null
    first_name: string | null
    last_name: string | null
  }
}

export interface NotificationPreferences {
  id: string
  user_id: string
  likes: boolean
  comments: boolean
  follows: boolean
  mentions: boolean
  created_at: string
  updated_at: string
}
