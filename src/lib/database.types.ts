export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          images?: string[] | null
          image_url?: string | null // Backward compatibility
          image_urls?: string[] | null
          video_urls?: string[] | null
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
          images?: string[] | null
          image_url?: string | null // Backward compatibility
          image_urls?: string[] | null
          video_urls?: string[] | null
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
          images?: string[] | null
          image_url?: string | null // Backward compatibility
          image_urls?: string[] | null
          video_urls?: string[] | null
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
          description: string | null
          category: 'restaurant' | 'event' | 'museum' | 'other'
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
          category: 'restaurant' | 'event' | 'museum' | 'other'
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
          category?: 'restaurant' | 'event' | 'museum' | 'other'
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