// Database types matching your Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SubscriptionTier = 'free' | 'medium' | 'premium'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid'
export type PostPrivacy = 'public' | 'friends'
export type PostType = 'original' | 'share' | 'quote'
export type PlaceCategory = 'restaurant' | 'event' | 'museum' | 'other'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          first_name: string | null
          last_name: string | null
          bio: string | null
          avatar_url: string | null
          is_private: boolean
          subscription_tier: SubscriptionTier
          subscription_status: SubscriptionStatus | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_started_at: string | null
          subscription_ends_at: string | null
          subscription_canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          first_name?: string | null
          last_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_private?: boolean
          subscription_tier?: SubscriptionTier
          subscription_status?: SubscriptionStatus | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_started_at?: string | null
          subscription_ends_at?: string | null
          subscription_canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          first_name?: string | null
          last_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_private?: boolean
          subscription_tier?: SubscriptionTier
          subscription_status?: SubscriptionStatus | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_started_at?: string | null
          subscription_ends_at?: string | null
          subscription_canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          privacy: PostPrivacy
          images: string[] | null
          image_url: string | null
          image_urls: string[] | null
          video_urls: string[] | null
          parent_post_id: string | null
          post_type: PostType
          quote_content: string | null
          engagement_score: number
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          privacy?: PostPrivacy
          images?: string[] | null
          image_url?: string | null
          image_urls?: string[] | null
          video_urls?: string[] | null
          parent_post_id?: string | null
          post_type?: PostType
          quote_content?: string | null
          engagement_score?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          privacy?: PostPrivacy
          images?: string[] | null
          image_url?: string | null
          image_urls?: string[] | null
          video_urls?: string[] | null
          parent_post_id?: string | null
          post_type?: PostType
          quote_content?: string | null
          engagement_score?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      post_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      places: {
        Row: {
          id: string
          name: string
          description: string | null
          category: PlaceCategory
          latitude: number
          longitude: number
          address: string
          website: string | null
          phone: string | null
          is_pet_friendly: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: PlaceCategory
          latitude: number
          longitude: number
          address: string
          website?: string | null
          phone?: string | null
          is_pet_friendly?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: PlaceCategory
          latitude?: number
          longitude?: number
          address?: string
          website?: string | null
          phone?: string | null
          is_pet_friendly?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      favorite_places: {
        Row: {
          id: string
          user_id: string
          place_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          place_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          place_id?: string
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: SubscriptionTier
          status: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          last_payment_date: string | null
          next_payment_date: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier: SubscriptionTier
          status: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          last_payment_date?: string | null
          next_payment_date?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: SubscriptionTier
          status?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          last_payment_date?: string | null
          next_payment_date?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_tier: SubscriptionTier
      post_privacy: PostPrivacy
      post_type: PostType
      place_category: PlaceCategory
    }
  }
}

// Extended types with relations
export interface PostWithUser extends Database['public']['Tables']['posts']['Row'] {
  user: Database['public']['Tables']['users']['Row']
  likes_count: number
  comments_count: number
  is_liked_by_user?: boolean
  parent_post?: PostWithUser | null
}

export interface CommentWithUser extends Database['public']['Tables']['comments']['Row'] {
  user: Database['public']['Tables']['users']['Row']
}

export interface PlaceWithDistance extends Database['public']['Tables']['places']['Row'] {
  distance?: number
  is_favorite?: boolean
}

export interface UserProfile extends Database['public']['Tables']['users']['Row'] {
  followers_count?: number
  following_count?: number
  posts_count?: number
  is_following?: boolean
  is_followed_by?: boolean
}
