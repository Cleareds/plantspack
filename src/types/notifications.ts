export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'reply'
export type NotificationEntityType = 'post' | 'comment'

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
