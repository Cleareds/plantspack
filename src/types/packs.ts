/**
 * TypeScript types for Packs system
 */

export type PackCategory = 'recipes' | 'traveling' | 'products' | 'resources' | 'lifestyle' | 'other'

export type PackMemberRole = 'admin' | 'moderator' | 'member'

export interface Pack {
  id: string
  creator_id: string
  title: string
  description: string | null
  banner_url: string | null
  website_url: string | null
  facebook_url: string | null
  twitter_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  category: PackCategory | null
  categories: PackCategory[]
  is_published: boolean
  view_count: number
  created_at: string
  updated_at: string
}

export interface PackWithCreator extends Pack {
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    subscription_tier: string | null
  }
}

export interface PackWithStats extends PackWithCreator {
  member_count: number
  post_count: number
  places_count: number
  is_member: boolean
  is_following: boolean
  user_role: PackMemberRole | null
}

export interface PackMember {
  id: string
  pack_id: string
  user_id: string
  role: PackMemberRole
  joined_at: string
}

export interface PackMemberWithUser extends PackMember {
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    subscription_tier: string | null
  }
}

export interface PackPost {
  id: string
  pack_id: string
  post_id: string
  added_by_user_id: string
  position: number
  section_name: string | null
  is_pinned: boolean
  added_at: string
}

export interface PackPostWithPost extends PackPost {
  posts: {
    id: string
    user_id: string
    content: string
    images: string[] | null
    video_urls: string[] | null
    privacy: string
    created_at: string
    users: {
      id: string
      username: string
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
      subscription_tier: string | null
    }
    post_likes: { id: string; user_id: string }[]
    comments: { id: string }[]
  }
}

export interface PackFollow {
  id: string
  pack_id: string
  user_id: string
  created_at: string
}

export interface CreatePackInput {
  title: string
  description?: string
  banner_url?: string
  website_url?: string
  facebook_url?: string
  twitter_url?: string
  instagram_url?: string
  tiktok_url?: string
  category?: PackCategory
  categories?: PackCategory[]
  is_published?: boolean
}

export interface UpdatePackInput {
  title?: string
  description?: string
  banner_url?: string
  website_url?: string
  facebook_url?: string
  twitter_url?: string
  instagram_url?: string
  tiktok_url?: string
  category?: PackCategory
  categories?: PackCategory[]
  is_published?: boolean
}

export interface AddPostToPackInput {
  pack_id: string
  post_id: string
  section_name?: string
  is_pinned?: boolean
}

export interface ReorderPackPostsInput {
  pack_id: string
  post_orders: {
    post_id: string
    position: number
  }[]
}

export interface PackFilters {
  category?: PackCategory
  search?: string
  creator_id?: string
  sort?: 'recent' | 'popular' | 'posts'
  limit?: number
  offset?: number
}

// Subscription tier limits
export const PACK_LIMITS = {
  free: 0,
  mid: 1,
  premium: 5
} as const

export type SubscriptionTier = keyof typeof PACK_LIMITS
