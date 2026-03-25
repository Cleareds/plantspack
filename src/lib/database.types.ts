export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PostCategory = 'recipe' | 'place' | 'event' | 'lifestyle' | 'activism' | 'question' | 'product' | 'general' | 'hotel' | 'organisation'

export interface CategoryInfo {
  slug: PostCategory
  display_name: string
  description: string
  icon_name: string
  display_order: number
  is_active: boolean
  color: string
}

export interface RecipeNutrition {
  calories?: string
  protein?: string
  fat?: string
  carbs?: string
  fiber?: string
}

export interface RecipeData {
  ingredients: string[]
  prep_time_min: number
  cook_time_min: number
  total_time_min?: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'desserts' | 'drinks'
  cuisine?: string
  nutrition?: RecipeNutrition
  source_url?: string
  source_attribution?: string
}

export interface EventData {
  start_time: string
  end_time?: string
  location: string
  ticket_url?: string
  is_recurring: boolean
}

export interface ProductData {
  brand: string
  price_range: string
  where_to_buy: string
  rating: number
}

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          slug: string
          display_name: string
          description: string | null
          icon_name: string
          display_order: number
          is_active: boolean
          color: string | null
        }
        Insert: {
          slug: string
          display_name: string
          description?: string | null
          icon_name: string
          display_order?: number
          is_active?: boolean
          color?: string | null
        }
        Update: {
          slug?: string
          display_name?: string
          description?: string | null
          icon_name?: string
          display_order?: number
          is_active?: boolean
          color?: string | null
        }
      }
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
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          privacy: 'public' | 'friends'
          category: PostCategory
          secondary_tags: string[] | null
          recipe_data: Json | null
          event_data: Json | null
          product_data: Json | null
          images?: string[] | null
          image_url?: string | null
          image_urls?: string[] | null
          video_urls?: string[] | null
          place_id?: string | null
          parent_post_id?: string | null
          post_type?: 'original' | 'share' | 'quote'
          quote_content?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          privacy?: 'public' | 'friends'
          category?: PostCategory
          secondary_tags?: string[] | null
          recipe_data?: Json | null
          event_data?: Json | null
          product_data?: Json | null
          images?: string[] | null
          image_url?: string | null
          image_urls?: string[] | null
          video_urls?: string[] | null
          place_id?: string | null
          parent_post_id?: string | null
          post_type?: 'original' | 'share' | 'quote'
          quote_content?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          privacy?: 'public' | 'friends'
          category?: PostCategory
          secondary_tags?: string[] | null
          recipe_data?: Json | null
          event_data?: Json | null
          product_data?: Json | null
          images?: string[] | null
          image_url?: string | null
          image_urls?: string[] | null
          video_urls?: string[] | null
          place_id?: string | null
          parent_post_id?: string | null
          post_type?: 'original' | 'share' | 'quote'
          quote_content?: string | null
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
          slug: string | null
          description: string | null
          category: 'eat' | 'hotel' | 'event' | 'store' | 'organisation' | 'other'
          latitude: number
          longitude: number
          address: string
          city: string | null
          country: string | null
          website: string | null
          phone: string | null
          is_pet_friendly: boolean
          source: string
          source_id: string | null
          images: string[]
          main_image_url: string | null
          price_range: string | null
          cuisine_types: string[]
          vegan_level: 'fully_vegan' | 'vegan_friendly' | 'vegan_options' | null
          opening_hours: Record<string, string> | null
          average_rating: number
          review_count: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          description?: string | null
          category: 'eat' | 'hotel' | 'event' | 'store' | 'organisation' | 'other'
          latitude: number
          longitude: number
          address: string
          city?: string | null
          country?: string | null
          website?: string | null
          phone?: string | null
          is_pet_friendly?: boolean
          source?: string
          source_id?: string | null
          images?: string[]
          main_image_url?: string | null
          price_range?: string | null
          cuisine_types?: string[]
          vegan_level?: 'fully_vegan' | 'vegan_friendly' | 'vegan_options' | null
          opening_hours?: Record<string, string> | null
          average_rating?: number
          review_count?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          description?: string | null
          category?: 'eat' | 'hotel' | 'event' | 'store' | 'organisation' | 'other'
          latitude?: number
          longitude?: number
          address?: string
          city?: string | null
          country?: string | null
          website?: string | null
          phone?: string | null
          is_pet_friendly?: boolean
          source?: string
          source_id?: string | null
          images?: string[]
          main_image_url?: string | null
          price_range?: string | null
          cuisine_types?: string[]
          vegan_level?: 'fully_vegan' | 'vegan_friendly' | 'vegan_options' | null
          opening_hours?: Record<string, string> | null
          average_rating?: number
          review_count?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}