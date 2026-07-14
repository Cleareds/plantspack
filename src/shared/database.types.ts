export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_release_config: {
        Row: {
          latest_version: string
          message: string | null
          min_supported_version: string
          platform: string
          store_url: string | null
          updated_at: string
        }
        Insert: {
          latest_version?: string
          message?: string | null
          min_supported_version?: string
          platform: string
          store_url?: string | null
          updated_at?: string
        }
        Update: {
          latest_version?: string
          message?: string | null
          min_supported_version?: string
          platform?: string
          store_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          description: string | null
          display_name: string
          display_order: number
          icon_name: string
          is_active: boolean | null
          slug: string
        }
        Insert: {
          color?: string | null
          description?: string | null
          display_name: string
          display_order?: number
          icon_name: string
          is_active?: boolean | null
          slug: string
        }
        Update: {
          color?: string | null
          description?: string | null
          display_name?: string
          display_order?: number
          icon_name?: string
          is_active?: boolean | null
          slug?: string
        }
        Relationships: []
      }
      city_experiences: {
        Row: {
          best_neighborhoods: string | null
          city: string
          city_slug: string
          country: string
          country_slug: string
          created_at: string
          deleted_at: string | null
          eating_out_rating: number | null
          edit_count: number | null
          edited_at: string | null
          grocery_rating: number | null
          id: string
          images: string[] | null
          overall_rating: number
          summary: string
          tips: string[] | null
          updated_at: string
          user_id: string
          visited_period: string | null
        }
        Insert: {
          best_neighborhoods?: string | null
          city: string
          city_slug: string
          country: string
          country_slug: string
          created_at?: string
          deleted_at?: string | null
          eating_out_rating?: number | null
          edit_count?: number | null
          edited_at?: string | null
          grocery_rating?: number | null
          id?: string
          images?: string[] | null
          overall_rating: number
          summary: string
          tips?: string[] | null
          updated_at?: string
          user_id: string
          visited_period?: string | null
        }
        Update: {
          best_neighborhoods?: string | null
          city?: string
          city_slug?: string
          country?: string
          country_slug?: string
          created_at?: string
          deleted_at?: string | null
          eating_out_rating?: number | null
          edit_count?: number | null
          edited_at?: string | null
          grocery_rating?: number | null
          id?: string
          images?: string[] | null
          overall_rating?: number
          summary?: string
          tips?: string[] | null
          updated_at?: string
          user_id?: string
          visited_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "city_experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "city_experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      city_populations: {
        Row: {
          city: string
          country: string
          population: number
          source: string | null
          updated_at: string | null
        }
        Insert: {
          city: string
          country: string
          population: number
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string
          country?: string
          population?: number
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          edit_count: number | null
          edited_at: string | null
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number | null
          edited_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number | null
          edited_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companions: {
        Row: {
          created_at: string
          id: string
          lifespan_days: number
          metadata: Json
          name: string
          species: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lifespan_days?: number
          metadata?: Json
          name: string
          species: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lifespan_days?: number
          metadata?: Json
          name?: string
          species?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contact_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contact_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      country_regions: {
        Row: {
          city_names: string[]
          country_slug: string
          created_at: string
          description: string | null
          id: number
          region_name: string
          region_slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          city_names?: string[]
          country_slug: string
          created_at?: string
          description?: string | null
          id?: number
          region_name: string
          region_slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          city_names?: string[]
          country_slug?: string
          created_at?: string
          description?: string | null
          id?: number
          region_name?: string
          region_slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_responses: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_responses_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_places: {
        Row: {
          created_at: string
          id: string
          place_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          place_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          place_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_places_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "favorite_places_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_saves: {
        Row: {
          created_at: string
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hashtags: {
        Row: {
          created_at: string | null
          id: string
          normalized_tag: string
          tag: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          normalized_tag: string
          tag: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          normalized_tag?: string
          tag?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      newsletter_sends: {
        Row: {
          bounced_at: string | null
          campaign: string
          clicked_at: string | null
          email_to: string
          id: string
          opened_at: string | null
          resend_message_id: string | null
          sent_at: string
          user_id: string
        }
        Insert: {
          bounced_at?: string | null
          campaign: string
          clicked_at?: string | null
          email_to: string
          id?: string
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string
          user_id: string
        }
        Update: {
          bounced_at?: string | null
          campaign?: string
          clicked_at?: string | null
          email_to?: string
          id?: string
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "newsletter_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_comments: boolean | null
          email_follows: boolean | null
          email_likes: boolean | null
          email_mentions: boolean | null
          id: string
          push_comments: boolean | null
          push_follows: boolean | null
          push_likes: boolean | null
          push_mentions: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_comments?: boolean | null
          email_follows?: boolean | null
          email_likes?: boolean | null
          email_mentions?: boolean | null
          id?: string
          push_comments?: boolean | null
          push_follows?: boolean | null
          push_likes?: boolean | null
          push_mentions?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_comments?: boolean | null
          email_follows?: boolean | null
          email_likes?: boolean | null
          email_mentions?: boolean | null
          id?: string
          push_comments?: boolean | null
          push_follows?: boolean | null
          push_likes?: boolean | null
          push_mentions?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          channels: string[] | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          read: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          channels?: string[] | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          channels?: string[] | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_follows: {
        Row: {
          created_at: string | null
          id: string
          pack_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pack_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pack_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_follows_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pack_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_members: {
        Row: {
          id: string
          joined_at: string | null
          pack_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          pack_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          pack_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_members_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pack_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_places: {
        Row: {
          added_at: string
          added_by_user_id: string
          id: string
          is_pinned: boolean | null
          pack_id: string
          place_id: string
          position: number | null
          section_name: string | null
        }
        Insert: {
          added_at?: string
          added_by_user_id: string
          id?: string
          is_pinned?: boolean | null
          pack_id: string
          place_id: string
          position?: number | null
          section_name?: string | null
        }
        Update: {
          added_at?: string
          added_by_user_id?: string
          id?: string
          is_pinned?: boolean | null
          pack_id?: string
          place_id?: string
          position?: number | null
          section_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pack_places_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pack_places_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_places_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_posts: {
        Row: {
          added_at: string | null
          added_by_user_id: string
          id: string
          is_pinned: boolean | null
          pack_id: string
          position: number | null
          post_id: string
          section_name: string | null
        }
        Insert: {
          added_at?: string | null
          added_by_user_id: string
          id?: string
          is_pinned?: boolean | null
          pack_id: string
          position?: number | null
          post_id: string
          section_name?: string | null
        }
        Update: {
          added_at?: string | null
          added_by_user_id?: string
          id?: string
          is_pinned?: boolean | null
          pack_id?: string
          position?: number | null
          post_id?: string
          section_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pack_posts_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pack_posts_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_posts_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      packs: {
        Row: {
          banner_url: string | null
          categories: string[] | null
          category: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_published: boolean | null
          is_verified: boolean
          slug: string
          tiktok_url: string | null
          title: string
          twitter_url: string | null
          updated_at: string | null
          view_count: number | null
          website_url: string | null
        }
        Insert: {
          banner_url?: string | null
          categories?: string[] | null
          category?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_published?: boolean | null
          is_verified?: boolean
          slug: string
          tiktok_url?: string | null
          title: string
          twitter_url?: string | null
          updated_at?: string | null
          view_count?: number | null
          website_url?: string | null
        }
        Update: {
          banner_url?: string | null
          categories?: string[] | null
          category?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_published?: boolean | null
          is_verified?: boolean
          slug?: string
          tiktok_url?: string | null
          title?: string
          twitter_url?: string | null
          updated_at?: string | null
          view_count?: number | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "packs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_claim_requests: {
        Row: {
          business_role: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          place_id: string
          proof_description: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          business_role?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          place_id: string
          proof_description: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          business_role?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          place_id?: string
          proof_description?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_claim_requests_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_claim_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_claim_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_claim_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_claim_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_contributors: {
        Row: {
          created_at: string
          id: string
          note: string | null
          place_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          place_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          place_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_contributors_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_contributors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_contributors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_corrections: {
        Row: {
          corrections: Json
          created_at: string | null
          id: string
          note: string | null
          place_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          corrections: Json
          created_at?: string | null
          id?: string
          note?: string | null
          place_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          corrections?: Json
          created_at?: string | null
          id?: string
          note?: string | null
          place_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_corrections_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      place_owners: {
        Row: {
          claim_request_id: string | null
          created_at: string
          id: string
          place_id: string
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          user_id: string
          verified_at: string
          verified_by: string
        }
        Insert: {
          claim_request_id?: string | null
          created_at?: string
          id?: string
          place_id: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          user_id: string
          verified_at?: string
          verified_by: string
        }
        Update: {
          claim_request_id?: string | null
          created_at?: string
          id?: string
          place_id?: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          user_id?: string
          verified_at?: string
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_owners_claim_request_id_fkey"
            columns: ["claim_request_id"]
            isOneToOne: false
            referencedRelation: "place_claim_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_owners_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_owners_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_owners_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_owners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_owners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_owners_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_owners_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          place_id: string
          related_place_id: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          place_id: string
          related_place_id?: string | null
          status?: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          place_id?: string
          related_place_id?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_reports_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_reports_related_place_id_fkey"
            columns: ["related_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_review_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_review_reactions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "place_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_review_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_review_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_review_replies: {
        Row: {
          author_role: string
          content: string
          created_at: string
          deleted_at: string | null
          edit_count: number | null
          edited_at: string | null
          id: string
          review_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_role: string
          content: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number | null
          edited_at?: string | null
          id?: string
          review_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_role?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number | null
          edited_at?: string | null
          id?: string
          review_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "place_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_review_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_review_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_reviews: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          edit_count: number | null
          edited_at: string | null
          engagement_score: number
          id: string
          images: string[] | null
          place_id: string
          rating: number
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number | null
          edited_at?: string | null
          engagement_score?: number
          id?: string
          images?: string[] | null
          place_id: string
          rating: number
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number | null
          edited_at?: string | null
          engagement_score?: number
          id?: string
          images?: string[] | null
          place_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_reviews_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_slug_aliases: {
        Row: {
          created_at: string
          old_slug: string
          place_id: string
        }
        Insert: {
          created_at?: string
          old_slug: string
          place_id: string
        }
        Update: {
          created_at?: string
          old_slug?: string
          place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_slug_aliases_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      place_staging: {
        Row: {
          address: string | null
          categories: string[] | null
          chain_filtered: boolean | null
          city: string | null
          country: string | null
          created_at: string
          date_refreshed: string | null
          decision: string
          decision_reason: string | null
          duplicate_of: string | null
          freshness_ok: boolean | null
          id: string
          imported_place_id: string | null
          latitude: number
          longitude: number
          name: string
          operator_action: string | null
          operator_decided_at: string | null
          operator_note: string | null
          operator_user_id: string | null
          phone: string | null
          quality_score: number | null
          raw: Json
          required_fields_ok: boolean | null
          source: string
          source_id: string
          updated_at: string
          vegan_confidence: number | null
          vegan_evidence: Json | null
          vegan_level: string | null
          website: string | null
          website_checked_at: string | null
          website_ok: boolean | null
          website_signal: Json | null
        }
        Insert: {
          address?: string | null
          categories?: string[] | null
          chain_filtered?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_refreshed?: string | null
          decision?: string
          decision_reason?: string | null
          duplicate_of?: string | null
          freshness_ok?: boolean | null
          id?: string
          imported_place_id?: string | null
          latitude: number
          longitude: number
          name: string
          operator_action?: string | null
          operator_decided_at?: string | null
          operator_note?: string | null
          operator_user_id?: string | null
          phone?: string | null
          quality_score?: number | null
          raw: Json
          required_fields_ok?: boolean | null
          source: string
          source_id: string
          updated_at?: string
          vegan_confidence?: number | null
          vegan_evidence?: Json | null
          vegan_level?: string | null
          website?: string | null
          website_checked_at?: string | null
          website_ok?: boolean | null
          website_signal?: Json | null
        }
        Update: {
          address?: string | null
          categories?: string[] | null
          chain_filtered?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_refreshed?: string | null
          decision?: string
          decision_reason?: string | null
          duplicate_of?: string | null
          freshness_ok?: boolean | null
          id?: string
          imported_place_id?: string | null
          latitude?: number
          longitude?: number
          name?: string
          operator_action?: string | null
          operator_decided_at?: string | null
          operator_note?: string | null
          operator_user_id?: string | null
          phone?: string | null
          quality_score?: number | null
          raw?: Json
          required_fields_ok?: boolean | null
          source?: string
          source_id?: string
          updated_at?: string
          vegan_confidence?: number | null
          vegan_evidence?: Json | null
          vegan_level?: string | null
          website?: string | null
          website_checked_at?: string | null
          website_ok?: boolean | null
          website_signal?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "place_staging_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_staging_imported_place_id_fkey"
            columns: ["imported_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_staging_operator_user_id_fkey"
            columns: ["operator_user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_staging_operator_user_id_fkey"
            columns: ["operator_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_submissions: {
        Row: {
          address: string | null
          category: string
          city: string | null
          country: string | null
          created_at: string
          id: string
          images: string[] | null
          imported_place_id: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          user_id: string
          vegan_level: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          imported_place_id?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          user_id: string
          vegan_level?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          imported_place_id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          user_id?: string
          vegan_level?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_submissions_imported_place_id_fkey"
            columns: ["imported_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "place_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_verification_log: {
        Row: {
          check_type: string
          checked_at: string
          created_at: string
          id: string
          place_id: string
          result: Json
        }
        Insert: {
          check_type: string
          checked_at?: string
          created_at?: string
          id?: string
          place_id: string
          result: Json
        }
        Update: {
          check_type?: string
          checked_at?: string
          created_at?: string
          id?: string
          place_id?: string
          result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "place_verification_log_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string
          admin_notes: string | null
          archived_at: string | null
          archived_reason: string | null
          average_rating: number | null
          business_status: string
          categorization_note: string | null
          category: string
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          cuisine_types: string[] | null
          description: string | null
          event_time: Json | null
          foursquare_checked_at: string | null
          foursquare_data: Json | null
          foursquare_id: string | null
          foursquare_status: string | null
          geom: unknown
          happycow_id: string | null
          id: string
          images: string[] | null
          is_pet_friendly: boolean | null
          is_verified: boolean | null
          last_verified_at: string | null
          latitude: number
          longitude: number
          main_image_url: string | null
          name: string
          opening_hours: Json | null
          osm_ref: string | null
          pet_friendly_level: Database["public"]["Enums"]["pet_friendly_level"]
          pet_friendly_notes: string | null
          pet_friendly_source: string | null
          pet_friendly_verified_at: string | null
          phone: string | null
          price_range: string | null
          reopen_date: string | null
          review_count: number | null
          scheduled_archive_at: string | null
          search_vector: unknown
          slug: string | null
          source: string | null
          source_id: string | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string
          vegan_level: string | null
          vegguide_checked_at: string | null
          vegguide_id: number | null
          verification_level: number
          verification_method: string | null
          verification_status: string | null
          website: string | null
        }
        Insert: {
          address: string
          admin_notes?: string | null
          archived_at?: string | null
          archived_reason?: string | null
          average_rating?: number | null
          business_status?: string
          categorization_note?: string | null
          category: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          cuisine_types?: string[] | null
          description?: string | null
          event_time?: Json | null
          foursquare_checked_at?: string | null
          foursquare_data?: Json | null
          foursquare_id?: string | null
          foursquare_status?: string | null
          geom?: unknown
          happycow_id?: string | null
          id?: string
          images?: string[] | null
          is_pet_friendly?: boolean | null
          is_verified?: boolean | null
          last_verified_at?: string | null
          latitude: number
          longitude: number
          main_image_url?: string | null
          name: string
          opening_hours?: Json | null
          osm_ref?: string | null
          pet_friendly_level?: Database["public"]["Enums"]["pet_friendly_level"]
          pet_friendly_notes?: string | null
          pet_friendly_source?: string | null
          pet_friendly_verified_at?: string | null
          phone?: string | null
          price_range?: string | null
          reopen_date?: string | null
          review_count?: number | null
          scheduled_archive_at?: string | null
          search_vector?: unknown
          slug?: string | null
          source?: string | null
          source_id?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
          vegan_level?: string | null
          vegguide_checked_at?: string | null
          vegguide_id?: number | null
          verification_level?: number
          verification_method?: string | null
          verification_status?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          admin_notes?: string | null
          archived_at?: string | null
          archived_reason?: string | null
          average_rating?: number | null
          business_status?: string
          categorization_note?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          cuisine_types?: string[] | null
          description?: string | null
          event_time?: Json | null
          foursquare_checked_at?: string | null
          foursquare_data?: Json | null
          foursquare_id?: string | null
          foursquare_status?: string | null
          geom?: unknown
          happycow_id?: string | null
          id?: string
          images?: string[] | null
          is_pet_friendly?: boolean | null
          is_verified?: boolean | null
          last_verified_at?: string | null
          latitude?: number
          longitude?: number
          main_image_url?: string | null
          name?: string
          opening_hours?: Json | null
          osm_ref?: string | null
          pet_friendly_level?: Database["public"]["Enums"]["pet_friendly_level"]
          pet_friendly_notes?: string | null
          pet_friendly_source?: string | null
          pet_friendly_verified_at?: string | null
          phone?: string | null
          price_range?: string | null
          reopen_date?: string | null
          review_count?: number | null
          scheduled_archive_at?: string | null
          search_vector?: unknown
          slug?: string | null
          source?: string | null
          source_id?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
          vegan_level?: string | null
          vegguide_checked_at?: string | null
          vegguide_id?: number | null
          verification_level?: number
          verification_method?: string | null
          verification_status?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "places_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "places_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hashtags: {
        Row: {
          created_at: string | null
          hashtag_id: string
          id: string
          post_id: string
        }
        Insert: {
          created_at?: string | null
          hashtag_id: string
          id?: string
          post_id: string
        }
        Update: {
          created_at?: string | null
          hashtag_id?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          category: string
          content: string
          content_type: string | null
          content_warnings: string[] | null
          created_at: string
          deleted_at: string | null
          edit_count: number | null
          edited_at: string | null
          engagement_score: number | null
          event_data: Json | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          images: Json | null
          is_featured: boolean | null
          is_pinned: boolean | null
          is_premium_content: boolean | null
          is_sensitive: boolean | null
          is_verified: boolean | null
          language: string | null
          location_city: string | null
          location_data: Json | null
          location_region: string | null
          mentioned_users: string[] | null
          mood: string | null
          parent_post_id: string | null
          place_id: string | null
          post_type: string | null
          privacy: string | null
          product_data: Json | null
          quote_content: string | null
          recipe_data: Json | null
          secondary_tags: string[] | null
          slug: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
          video_urls: string[] | null
          view_count: number | null
        }
        Insert: {
          category?: string
          content: string
          content_type?: string | null
          content_warnings?: string[] | null
          created_at?: string
          deleted_at?: string | null
          edit_count?: number | null
          edited_at?: string | null
          engagement_score?: number | null
          event_data?: Json | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          images?: Json | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          is_premium_content?: boolean | null
          is_sensitive?: boolean | null
          is_verified?: boolean | null
          language?: string | null
          location_city?: string | null
          location_data?: Json | null
          location_region?: string | null
          mentioned_users?: string[] | null
          mood?: string | null
          parent_post_id?: string | null
          place_id?: string | null
          post_type?: string | null
          privacy?: string | null
          product_data?: Json | null
          quote_content?: string | null
          recipe_data?: Json | null
          secondary_tags?: string[] | null
          slug?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
          video_urls?: string[] | null
          view_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          content_type?: string | null
          content_warnings?: string[] | null
          created_at?: string
          deleted_at?: string | null
          edit_count?: number | null
          edited_at?: string | null
          engagement_score?: number | null
          event_data?: Json | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          images?: Json | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          is_premium_content?: boolean | null
          is_sensitive?: boolean | null
          is_verified?: boolean | null
          language?: string | null
          location_city?: string | null
          location_data?: Json | null
          location_region?: string | null
          mentioned_users?: string[] | null
          mood?: string | null
          parent_post_id?: string | null
          place_id?: string | null
          post_type?: string | null
          privacy?: string | null
          product_data?: Json | null
          quote_content?: string | null
          recipe_data?: Json | null
          secondary_tags?: string[] | null
          slug?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
          video_urls?: string[] | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      published_cities: {
        Row: {
          cards: number
          lat: number
          lng: number
          name: string
          places: number
          reputation: number
          tier: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cards?: number
          lat: number
          lng: number
          name: string
          places?: number
          reputation?: number
          tier?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cards?: number
          lat?: number
          lng?: number
          name?: string
          places?: number
          reputation?: number
          tier?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          created_at: string | null
          id: string
          identifier: string
          updated_at: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          created_at?: string | null
          id?: string
          identifier: string
          updated_at?: string | null
          window_end: string
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          created_at?: string | null
          id?: string
          identifier?: string
          updated_at?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      real_world_tree_orders: {
        Row: {
          created_at: string
          id: string
          ledger_id: string | null
          notes: string | null
          partner: string | null
          partner_tree_id: string | null
          planted_at: string | null
          sprouts_spent: number
          status: string
          tree_lat: number | null
          tree_lng: number | null
          tree_location: string | null
          updated_at: string
          user_id: string
          user_message: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ledger_id?: string | null
          notes?: string | null
          partner?: string | null
          partner_tree_id?: string | null
          planted_at?: string | null
          sprouts_spent: number
          status?: string
          tree_lat?: number | null
          tree_lng?: number | null
          tree_location?: string | null
          updated_at?: string
          user_id: string
          user_message?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ledger_id?: string | null
          notes?: string | null
          partner?: string | null
          partner_tree_id?: string | null
          planted_at?: string | null
          sprouts_spent?: number
          status?: string
          tree_lat?: number | null
          tree_lng?: number | null
          tree_location?: string | null
          updated_at?: string
          user_id?: string
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "real_world_tree_orders_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "user_sprouts_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_world_tree_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "real_world_tree_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_reviews: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          edit_count: number | null
          edited_at: string | null
          id: string
          images: string[] | null
          post_id: string
          rating: number
          updated_at: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          edit_count?: number | null
          edited_at?: string | null
          id?: string
          images?: string[] | null
          post_id: string
          rating: number
          updated_at?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          edit_count?: number | null
          edited_at?: string | null
          id?: string
          images?: string[] | null
          post_id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_reviews_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recipe_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reported_id: string
          reported_type: string
          reporter_id: string
          resolution: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reported_id: string
          reported_type: string
          reporter_id: string
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reported_type?: string
          reporter_id?: string
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_votes: {
        Row: {
          created_at: string
          feature_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "roadmap_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      route_places: {
        Row: {
          id: string
          note: string | null
          place_id: string | null
          position: number
          route_id: string | null
          stay_duration_min: number | null
        }
        Insert: {
          id?: string
          note?: string | null
          place_id?: string | null
          position?: number
          route_id?: string | null
          stay_duration_min?: number | null
        }
        Update: {
          id?: string
          note?: string | null
          place_id?: string | null
          position?: number
          route_id?: string | null
          stay_duration_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_places_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          category: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          difficulty: string | null
          estimated_duration_min: number | null
          id: string
          images: string[] | null
          is_published: boolean | null
          polyline: string | null
          slug: string | null
          title: string
          total_distance_km: number | null
          transport_mode: string | null
          updated_at: string | null
          waypoints: Json
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          difficulty?: string | null
          estimated_duration_min?: number | null
          id?: string
          images?: string[] | null
          is_published?: boolean | null
          polyline?: string | null
          slug?: string | null
          title: string
          total_distance_km?: number | null
          transport_mode?: string | null
          updated_at?: string | null
          waypoints?: Json
        }
        Update: {
          category?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          difficulty?: string | null
          estimated_duration_min?: number | null
          id?: string
          images?: string[] | null
          is_published?: boolean | null
          polyline?: string | null
          slug?: string | null
          title?: string
          total_distance_km?: number | null
          transport_mode?: string | null
          updated_at?: string | null
          waypoints?: Json
        }
        Relationships: [
          {
            foreignKeyName: "routes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "routes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          clicked_kind: string | null
          clicked_slug: string | null
          created_at: string
          id: string
          q: string
          q_normalized: string | null
          result_count: number
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          clicked_kind?: string | null
          clicked_slug?: string | null
          created_at?: string
          id?: string
          q: string
          q_normalized?: string | null
          result_count?: number
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_kind?: string | null
          clicked_slug?: string | null
          created_at?: string
          id?: string
          q?: string
          q_normalized?: string | null
          result_count?: number
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "search_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      sprouts_redemptions: {
        Row: {
          code: string | null
          created_at: string
          fulfilled_at: string | null
          id: string
          ledger_id: string | null
          notes: string | null
          payload: Json | null
          reward_type: string
          sprouts_spent: number
          status: string
          user_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          ledger_id?: string | null
          notes?: string | null
          payload?: Json | null
          reward_type: string
          sprouts_spent: number
          status?: string
          user_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          ledger_id?: string | null
          notes?: string | null
          payload?: Json | null
          reward_type?: string
          sprouts_spent?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprouts_redemptions_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "user_sprouts_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprouts_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sprouts_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          event_data: Json
          event_type: string
          id: string
          processed_at: string
          stripe_event_id: string
          subscription_id: string | null
        }
        Insert: {
          event_data: Json
          event_type: string
          id?: string
          processed_at?: string
          stripe_event_id: string
          subscription_id?: string | null
        }
        Update: {
          event_data?: Json
          event_type?: string
          id?: string
          processed_at?: string
          stripe_event_id?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_scans: {
        Row: {
          allergens: string[] | null
          cost_usd: number
          created_at: string
          guest_id: string | null
          id: string
          image_hash: string | null
          ip_hash: string | null
          reject_reason: string | null
          rejected: boolean
          result: Json | null
          tool: string
          user_id: string | null
          verdict: string | null
        }
        Insert: {
          allergens?: string[] | null
          cost_usd?: number
          created_at?: string
          guest_id?: string | null
          id?: string
          image_hash?: string | null
          ip_hash?: string | null
          reject_reason?: string | null
          rejected?: boolean
          result?: Json | null
          tool: string
          user_id?: string | null
          verdict?: string | null
        }
        Update: {
          allergens?: string[] | null
          cost_usd?: number
          created_at?: string
          guest_id?: string | null
          id?: string
          image_hash?: string | null
          ip_hash?: string | null
          reject_reason?: string | null
          rejected?: boolean
          result?: Json | null
          tool?: string
          user_id?: string | null
          verdict?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_code: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_code: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_code?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_followed_cities: {
        Row: {
          city: string
          country: string
          created_at: string | null
          id: string
          last_seen_grade: string | null
          last_seen_score: number | null
          last_visited_at: string | null
          score_formula_version: number
          user_id: string
        }
        Insert: {
          city: string
          country: string
          created_at?: string | null
          id?: string
          last_seen_grade?: string | null
          last_seen_score?: number | null
          last_visited_at?: string | null
          score_formula_version?: number
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          last_seen_grade?: string | null
          last_seen_score?: number | null
          last_visited_at?: string | null
          score_formula_version?: number
          user_id?: string
        }
        Relationships: []
      }
      user_forest_trees: {
        Row: {
          created_at: string
          dedication: string | null
          display_order: number
          id: string
          matured_at: string
          species: string | null
          sprouts_seeded: number
          user_id: string
        }
        Insert: {
          created_at?: string
          dedication?: string | null
          display_order?: number
          id?: string
          matured_at?: string
          species?: string | null
          sprouts_seeded: number
          user_id: string
        }
        Update: {
          created_at?: string
          dedication?: string | null
          display_order?: number
          id?: string
          matured_at?: string
          species?: string | null
          sprouts_seeded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_forest_trees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_forest_trees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interaction_patterns: {
        Row: {
          active_hours: number[] | null
          author_affinity_scores: Json | null
          calculation_version: number | null
          content_type_scores: Json | null
          discovery_openness: number | null
          engagement_velocity: number | null
          id: string
          last_calculated: string | null
          network_similarity_score: number | null
          preferred_post_length: string | null
          session_duration_avg: number | null
          tag_affinity_scores: Json | null
          user_id: string
        }
        Insert: {
          active_hours?: number[] | null
          author_affinity_scores?: Json | null
          calculation_version?: number | null
          content_type_scores?: Json | null
          discovery_openness?: number | null
          engagement_velocity?: number | null
          id?: string
          last_calculated?: string | null
          network_similarity_score?: number | null
          preferred_post_length?: string | null
          session_duration_avg?: number | null
          tag_affinity_scores?: Json | null
          user_id: string
        }
        Update: {
          active_hours?: number[] | null
          author_affinity_scores?: Json | null
          calculation_version?: number | null
          content_type_scores?: Json | null
          discovery_openness?: number | null
          engagement_velocity?: number | null
          id?: string
          last_calculated?: string | null
          network_similarity_score?: number | null
          preferred_post_length?: string | null
          session_duration_avg?: number | null
          tag_affinity_scores?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interaction_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_interaction_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mutes: {
        Row: {
          created_at: string | null
          id: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mutes_muted_id_fkey"
            columns: ["muted_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_mutes_muted_id_fkey"
            columns: ["muted_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mutes_muter_id_fkey"
            columns: ["muter_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_mutes_muter_id_fkey"
            columns: ["muter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_place_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          place_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          place_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          place_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_place_notes_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          allergens: string[] | null
          created_at: string
          default_vegan_level: string | null
          distance_unit: string
          email_notifications: boolean | null
          feed_categories: string[] | null
          id: string
          privacy_level: string | null
          push_announcements: boolean
          push_notifications: boolean | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allergens?: string[] | null
          created_at?: string
          default_vegan_level?: string | null
          distance_unit?: string
          email_notifications?: boolean | null
          feed_categories?: string[] | null
          id?: string
          privacy_level?: string | null
          push_announcements?: boolean
          push_notifications?: boolean | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allergens?: string[] | null
          created_at?: string
          default_vegan_level?: string | null
          distance_unit?: string
          email_notifications?: boolean | null
          feed_categories?: string[] | null
          id?: string
          privacy_level?: string | null
          push_announcements?: boolean
          push_notifications?: boolean | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sprouts_ledger: {
        Row: {
          action_type: string
          amount: number
          base_amount: number
          created_at: string
          id: string
          metadata: Json | null
          multiplier: number
          reference_id: string | null
          reference_type: string | null
          reversal_of: string | null
          reversed_at: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          amount: number
          base_amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          multiplier?: number
          reference_id?: string | null
          reference_type?: string | null
          reversal_of?: string | null
          reversed_at?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          amount?: number
          base_amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          multiplier?: number
          reference_id?: string | null
          reference_type?: string | null
          reversal_of?: string | null
          reversed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sprouts_ledger_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "user_sprouts_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sprouts_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_sprouts_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trees: {
        Row: {
          created_at: string
          current_stage: number
          real_world_planted_count: number
          stage_reached_at: Json | null
          total_seeded: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_stage?: number
          real_world_planted_count?: number
          stage_reached_at?: Json | null
          total_seeded?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_stage?: number
          real_world_planted_count?: number
          stage_reached_at?: Json | null
          total_seeded?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_trees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_trees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          bio: string | null
          cooking_frequency: string | null
          created_at: string
          current_challenges: string[] | null
          dietary_specifics: string[] | null
          donor_source: string | null
          email: string
          favourite_vegan_meal: string | null
          first_name: string | null
          forest_size: number
          home_city: string | null
          home_country: string | null
          id: string
          is_banned: boolean | null
          is_private: boolean | null
          is_vegan: string | null
          last_name: string | null
          marketing_email_token: string | null
          newsletter_opt_in: boolean
          newsletter_opted_in_at: string | null
          newsletter_source: string | null
          newsletter_unsubscribed_at: string | null
          role: string | null
          sprouts_balance: number
          sprouts_lifetime: number
          sprouts_seeded: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_period_end: string | null
          subscription_period_start: string | null
          subscription_status: string | null
          subscription_tier: string | null
          transition_story: string | null
          trust_score: number
          updated_at: string
          username: string
          vegan_reasons: string[] | null
          vegan_since: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          bio?: string | null
          cooking_frequency?: string | null
          created_at?: string
          current_challenges?: string[] | null
          dietary_specifics?: string[] | null
          donor_source?: string | null
          email: string
          favourite_vegan_meal?: string | null
          first_name?: string | null
          forest_size?: number
          home_city?: string | null
          home_country?: string | null
          id: string
          is_banned?: boolean | null
          is_private?: boolean | null
          is_vegan?: string | null
          last_name?: string | null
          marketing_email_token?: string | null
          newsletter_opt_in?: boolean
          newsletter_opted_in_at?: string | null
          newsletter_source?: string | null
          newsletter_unsubscribed_at?: string | null
          role?: string | null
          sprouts_balance?: number
          sprouts_lifetime?: number
          sprouts_seeded?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_period_end?: string | null
          subscription_period_start?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          transition_story?: string | null
          trust_score?: number
          updated_at?: string
          username: string
          vegan_reasons?: string[] | null
          vegan_since?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          bio?: string | null
          cooking_frequency?: string | null
          created_at?: string
          current_challenges?: string[] | null
          dietary_specifics?: string[] | null
          donor_source?: string | null
          email?: string
          favourite_vegan_meal?: string | null
          first_name?: string | null
          forest_size?: number
          home_city?: string | null
          home_country?: string | null
          id?: string
          is_banned?: boolean | null
          is_private?: boolean | null
          is_vegan?: string | null
          last_name?: string | null
          marketing_email_token?: string | null
          newsletter_opt_in?: boolean
          newsletter_opted_in_at?: string | null
          newsletter_source?: string | null
          newsletter_unsubscribed_at?: string | null
          role?: string | null
          sprouts_balance?: number
          sprouts_lifetime?: number
          sprouts_seeded?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_period_end?: string | null
          subscription_period_start?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          transition_story?: string | null
          trust_score?: number
          updated_at?: string
          username?: string
          vegan_reasons?: string[] | null
          vegan_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "user_contributions_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      city_experiences_summary: {
        Row: {
          avg_eating_out_rating: number | null
          avg_grocery_rating: number | null
          avg_overall_rating: number | null
          city: string | null
          city_slug: string | null
          country: string | null
          country_slug: string | null
          experience_count: number | null
        }
        Relationships: []
      }
      city_scores: {
        Row: {
          accessibility: number | null
          center_lat: number | null
          center_lng: number | null
          choice: number | null
          city: string | null
          city_slug: string | null
          computed_at: string | null
          country: string | null
          fv_count: number | null
          grade: string | null
          per_capita: number | null
          place_count: number | null
          population: number | null
          quality: number | null
          score: number | null
          variety: number | null
          ve_total: number | null
          vf_count: number | null
        }
        Relationships: []
      }
      directory_cities: {
        Row: {
          city: string | null
          city_slug: string | null
          country: string | null
          eat_count: number | null
          fully_vegan_count: number | null
          hotel_count: number | null
          pet_friendly_count: number | null
          place_count: number | null
          sample_names: string[] | null
          store_count: number | null
          top_cuisines: string[] | null
        }
        Relationships: []
      }
      directory_countries: {
        Row: {
          city_count: number | null
          country: string | null
          country_slug: string | null
          eat_count: number | null
          fully_vegan_count: number | null
          hotel_count: number | null
          place_count: number | null
          store_count: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      platform_stats: {
        Row: {
          cities: number | null
          cities_ranked: number | null
          countries: number | null
          fully_vegan: number | null
          restaurants: number | null
          sanctuaries: number | null
          stays: number | null
          stores: number | null
          total_places: number | null
        }
        Relationships: []
      }
      user_contributions_summary: {
        Row: {
          city_experiences_written: number | null
          corrections_submitted: number | null
          packs_created: number | null
          places_added: number | null
          posts_published: number | null
          recipe_reviews_written: number | null
          reviews_written: number | null
          user_id: string | null
        }
        Insert: {
          city_experiences_written?: never
          corrections_submitted?: never
          packs_created?: never
          places_added?: never
          posts_published?: never
          recipe_reviews_written?: never
          reviews_written?: never
          user_id?: string | null
        }
        Update: {
          city_experiences_written?: never
          corrections_submitted?: never
          packs_created?: never
          places_added?: never
          posts_published?: never
          recipe_reviews_written?: never
          reviews_written?: never
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      bulk_remove_place_tag: {
        Args: { p_place_ids: string[]; p_tag: string }
        Returns: undefined
      }
      calculate_review_engagement_score: {
        Args: { review_uuid: string }
        Returns: number
      }
      check_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: Json
      }
      check_rate_limit_comments: { Args: { p_user_id: string }; Returns: Json }
      check_rate_limit_posts: { Args: { p_user_id: string }; Returns: Json }
      check_user_claim_status: {
        Args: { p_place_id: string; p_user_id: string }
        Returns: {
          claim_id: string
          created_at: string
          has_claim: boolean
          rejection_reason: string
          status: string
        }[]
      }
      cleanup_rate_limits: { Args: never; Returns: number }
      debug_auth_triggers: {
        Args: never
        Returns: {
          action: string
          event: string
          trigger_name: string
        }[]
      }
      delete_post: { Args: { post_id: string }; Returns: Json }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_pack_slug: {
        Args: { pack_id: string; title: string }
        Returns: string
      }
      generate_post_slug: {
        Args: { post_id: string; post_title: string }
        Returns: string
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_comment_reaction_counts: {
        Args: { comment_uuid: string }
        Returns: {
          count: number
          reaction_type: string
        }[]
      }
      get_place_average_rating: {
        Args: { p_place_id: string }
        Returns: number
      }
      get_place_owner: {
        Args: { p_place_id: string }
        Returns: {
          avatar_url: string
          first_name: string
          last_name: string
          user_id: string
          username: string
          verified_at: string
        }[]
      }
      get_place_rating_distribution: {
        Args: { p_place_id: string }
        Returns: Json
      }
      get_post_reaction_counts: {
        Args: { post_uuid: string }
        Returns: {
          count: number
          reaction_type: string
        }[]
      }
      get_posts_by_hashtag: {
        Args: {
          hashtag_text: string
          page_limit?: number
          page_offset?: number
        }
        Returns: {
          comment_count: number
          content: string
          created_at: string
          id: string
          images: string[]
          like_count: number
          privacy: string
          updated_at: string
          user_id: string
          video_urls: string[]
        }[]
      }
      get_trending_hashtags: {
        Args: { days_back?: number; result_limit?: number }
        Returns: {
          recent_usage_count: number
          tag: string
          usage_count: number
        }[]
      }
      get_user_comment_reaction_stats: {
        Args: { user_uuid: string }
        Returns: {
          total_helpful: number
          total_inspiring: number
          total_likes: number
          total_reactions: number
          total_thoughtful: number
        }[]
      }
      get_user_complete_stats: {
        Args: { user_uuid: string }
        Returns: {
          comments_count: number
          followers_count: number
          following_count: number
          posts_count: number
          total_helpful: number
          total_inspiring: number
          total_likes: number
          total_reactions: number
          total_thoughtful: number
        }[]
      }
      get_user_contributions_summary: {
        Args: { user_uuid: string }
        Returns: {
          badge_codes: string[]
          city_experiences_written: number
          corrections_submitted: number
          packs_created: number
          places_added: number
          posts_published: number
          recipe_reviews_written: number
          reviews_written: number
        }[]
      }
      get_user_follow_stats: {
        Args: { user_uuid: string }
        Returns: {
          followers_count: number
          following_count: number
        }[]
      }
      get_user_owned_places: {
        Args: { p_user_id: string }
        Returns: {
          place_address: string
          place_category: string
          place_id: string
          place_name: string
          verified_at: string
        }[]
      }
      get_user_reaction_stats: {
        Args: { user_uuid: string }
        Returns: {
          total_helpful: number
          total_inspiring: number
          total_likes: number
          total_reactions: number
          total_thoughtful: number
        }[]
      }
      get_user_total_reaction_stats: {
        Args: { user_uuid: string }
        Returns: {
          total_helpful: number
          total_inspiring: number
          total_likes: number
          total_reactions: number
          total_thoughtful: number
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_pack_admin: {
        Args: { p_pack_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_blocked: {
        Args: { p_blocked_id: string; p_blocker_id: string }
        Returns: boolean
      }
      is_user_muted: {
        Args: { p_muted_id: string; p_muter_id: string }
        Returns: boolean
      }
      log_rate_limit: {
        Args: { p_action_type: string; p_user_id: string }
        Returns: undefined
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      nearby_cities: {
        Args: {
          exclude_city?: string
          lim?: number
          min_places?: number
          src_country: string
          src_lat: number
          src_lng: number
        }
        Returns: {
          centroid_lat: number
          centroid_lng: number
          city: string
          city_slug: string
          distance_km: number
          fully_vegan_count: number
          place_count: number
        }[]
      }
      nearby_places: {
        Args: {
          cat?: string
          lat: number
          lim?: number
          lng: number
          off_set?: number
        }
        Returns: {
          address: string
          admin_notes: string | null
          archived_at: string | null
          archived_reason: string | null
          average_rating: number | null
          business_status: string
          categorization_note: string | null
          category: string
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          cuisine_types: string[] | null
          description: string | null
          event_time: Json | null
          foursquare_checked_at: string | null
          foursquare_data: Json | null
          foursquare_id: string | null
          foursquare_status: string | null
          geom: unknown
          happycow_id: string | null
          id: string
          images: string[] | null
          is_pet_friendly: boolean | null
          is_verified: boolean | null
          last_verified_at: string | null
          latitude: number
          longitude: number
          main_image_url: string | null
          name: string
          opening_hours: Json | null
          osm_ref: string | null
          pet_friendly_level: Database["public"]["Enums"]["pet_friendly_level"]
          pet_friendly_notes: string | null
          pet_friendly_source: string | null
          pet_friendly_verified_at: string | null
          phone: string | null
          price_range: string | null
          reopen_date: string | null
          review_count: number | null
          scheduled_archive_at: string | null
          search_vector: unknown
          slug: string | null
          source: string | null
          source_id: string | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string
          vegan_level: string | null
          vegguide_checked_at: string | null
          vegguide_id: number | null
          verification_level: number
          verification_method: string | null
          verification_status: string | null
          website: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "places"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      places_submitted_by_user_24h: {
        Args: { p_user_id: string }
        Returns: number
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      refresh_directory_views: { Args: never; Returns: undefined }
      search_cities: {
        Args: { q: string; result_limit?: number; vl?: string }
        Returns: {
          city: string
          city_slug: string
          country: string
          country_slug: string
          fully_vegan_count: number
          place_count: number
          rank: number
        }[]
      }
      search_countries: {
        Args: { q: string; result_limit?: number; vl?: string }
        Returns: {
          city_count: number
          country: string
          country_slug: string
          place_count: number
          rank: number
        }[]
      }
      search_places: {
        Args: {
          cat?: string
          near_lat?: number
          near_lng?: number
          q: string
          result_limit?: number
          vl?: string
        }
        Returns: {
          average_rating: number
          category: string
          city: string
          country: string
          distance_km: number
          id: string
          main_image_url: string
          name: string
          rank: number
          review_count: number
          slug: string
          vegan_level: string
          verification_level: number
        }[]
      }
      search_recipes: {
        Args: { q: string; result_limit?: number }
        Returns: {
          created_at: string
          id: string
          image_url: string
          rank: number
          slug: string
          title: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      toggle_comment_reaction: {
        Args: { comment_uuid: string; reaction: string }
        Returns: boolean
      }
      toggle_place_review_reaction: {
        Args: { p_reaction_type: string; p_review_id: string }
        Returns: boolean
      }
      toggle_post_reaction: {
        Args: { post_uuid: string; reaction: string }
        Returns: boolean
      }
      unaccent: { Args: { "": string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      update_user_subscription: {
        Args: {
          new_status: string
          new_tier: string
          period_end?: string
          period_start?: string
          stripe_cust_id?: string
          stripe_sub_id?: string
          target_user_id: string
        }
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      viewport_places: {
        Args: {
          cat?: string
          lim?: number
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
        }
        Returns: {
          address: string
          admin_notes: string | null
          archived_at: string | null
          archived_reason: string | null
          average_rating: number | null
          business_status: string
          categorization_note: string | null
          category: string
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          cuisine_types: string[] | null
          description: string | null
          event_time: Json | null
          foursquare_checked_at: string | null
          foursquare_data: Json | null
          foursquare_id: string | null
          foursquare_status: string | null
          geom: unknown
          happycow_id: string | null
          id: string
          images: string[] | null
          is_pet_friendly: boolean | null
          is_verified: boolean | null
          last_verified_at: string | null
          latitude: number
          longitude: number
          main_image_url: string | null
          name: string
          opening_hours: Json | null
          osm_ref: string | null
          pet_friendly_level: Database["public"]["Enums"]["pet_friendly_level"]
          pet_friendly_notes: string | null
          pet_friendly_source: string | null
          pet_friendly_verified_at: string | null
          phone: string | null
          price_range: string | null
          reopen_date: string | null
          review_count: number | null
          scheduled_archive_at: string | null
          search_vector: unknown
          slug: string | null
          source: string | null
          source_id: string | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string
          vegan_level: string | null
          vegguide_checked_at: string | null
          vegguide_id: number | null
          verification_level: number
          verification_method: string | null
          verification_status: string | null
          website: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "places"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      pet_friendly_level:
        | "unknown"
        | "no"
        | "outdoor_only"
        | "welcome"
        | "welcome_with_restrictions"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      pet_friendly_level: [
        "unknown",
        "no",
        "outdoor_only",
        "welcome",
        "welcome_with_restrictions",
      ],
    },
  },
} as const
