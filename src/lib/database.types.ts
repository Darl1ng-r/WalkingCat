export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          weight_kg: number | null;
          challenge_difficulty: 'easy' | 'standard';
          onboarded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          weight_kg?: number | null;
          challenge_difficulty?: 'easy' | 'standard';
          onboarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          weight_kg?: number | null;
          challenge_difficulty?: 'easy' | 'standard';
          onboarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      privacy_settings: {
        Row: {
          user_id: string;
          share_walks_with_friends: boolean;
          share_milestones_with_friends: boolean;
          show_on_friends_leaderboard: boolean;
          share_cat_cards: boolean;
          discoverable_by_username: boolean;
          save_sighting_area: boolean;
          hide_route_ends: boolean;
          hide_route_ends_m: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          share_walks_with_friends?: boolean;
          share_milestones_with_friends?: boolean;
          show_on_friends_leaderboard?: boolean;
          share_cat_cards?: boolean;
          discoverable_by_username?: boolean;
          save_sighting_area?: boolean;
          hide_route_ends?: boolean;
          hide_route_ends_m?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          share_walks_with_friends?: boolean;
          share_milestones_with_friends?: boolean;
          show_on_friends_leaderboard?: boolean;
          share_cat_cards?: boolean;
          discoverable_by_username?: boolean;
          save_sighting_area?: boolean;
          hide_route_ends?: boolean;
          hide_route_ends_m?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      walks: {
        Row: {
          id: string;
          client_id: string;
          user_id: string;
          started_at: string;
          ended_at: string;
          duration_s: number;
          moving_time_s: number;
          distance_m: number;
          avg_speed_mps: number;
          route_polyline: string;
          point_count: number;
          steps: number | null;
          active_kcal: number | null;
          kcal_source: 'health' | 'estimate' | null;
          status: 'completed';
          is_suspicious: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          user_id: string;
          started_at: string;
          ended_at: string;
          duration_s: number;
          moving_time_s: number;
          distance_m: number;
          avg_speed_mps?: number;
          route_polyline?: string;
          point_count?: number;
          steps?: number | null;
          active_kcal?: number | null;
          kcal_source?: 'health' | 'estimate' | null;
          status?: 'completed';
          is_suspicious?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          user_id?: string;
          started_at?: string;
          ended_at?: string;
          duration_s?: number;
          moving_time_s?: number;
          distance_m?: number;
          avg_speed_mps?: number;
          route_polyline?: string;
          point_count?: number;
          steps?: number | null;
          active_kcal?: number | null;
          kcal_source?: 'health' | 'estimate' | null;
          status?: 'completed';
          is_suspicious?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_activity: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          steps: number;
          active_kcal: number | null;
          kcal_source: 'health' | 'estimate' | null;
          source: 'healthkit' | 'health_connect' | 'none';
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          steps?: number;
          active_kcal?: number | null;
          kcal_source?: 'health' | 'estimate' | null;
          source?: 'healthkit' | 'health_connect' | 'none';
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          steps?: number;
          active_kcal?: number | null;
          kcal_source?: 'health' | 'estimate' | null;
          source?: 'healthkit' | 'health_connect' | 'none';
          updated_at?: string;
        };
        Relationships: [];
      };
      sightings: {
        Row: {
          id: string;
          user_id: string;
          walk_id: string | null;
          photo_path: string;
          sha256: string;
          phash: string | null;
          taken_at: string;
          area_geohash: string | null;
          status: 'pending' | 'accepted' | 'rejected' | 'flagged';
          reject_reason: string | null;
          cat_confidence: number | null;
          cat_id: string | null;
          validated_at: string | null;
          validation_attempts: number;
          validation_meta: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          walk_id?: string | null;
          photo_path: string;
          sha256: string;
          phash?: string | null;
          taken_at: string;
          area_geohash?: string | null;
          status?: 'pending' | 'accepted' | 'rejected' | 'flagged';
          reject_reason?: string | null;
          cat_confidence?: number | null;
          cat_id?: string | null;
          validated_at?: string | null;
          validation_attempts?: number;
          validation_meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          walk_id?: string | null;
          photo_path?: string;
          sha256?: string;
          phash?: string | null;
          taken_at?: string;
          area_geohash?: string | null;
          status?: 'pending' | 'accepted' | 'rejected' | 'flagged';
          reject_reason?: string | null;
          cat_confidence?: number | null;
          cat_id?: string | null;
          validated_at?: string | null;
          validation_attempts?: number;
          validation_meta?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      app_config: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      cats: {
        Row: {
          id: string;
          user_id: string;
          card_number: number;
          nickname: string | null;
          cover_sighting_id: string | null;
          cover_photo_path: string | null;
          sighting_count: number;
          first_seen_at: string;
          last_seen_at: string;
          area_geohash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_number?: number;
          nickname?: string | null;
          cover_sighting_id?: string | null;
          cover_photo_path?: string | null;
          sighting_count?: number;
          first_seen_at?: string;
          last_seen_at?: string;
          area_geohash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_number?: number;
          nickname?: string | null;
          cover_sighting_id?: string | null;
          cover_photo_path?: string | null;
          sighting_count?: number;
          first_seen_at?: string;
          last_seen_at?: string;
          area_geohash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      points_ledger: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          source_type:
            | 'walk'
            | 'walk_distance'
            | 'steps_milestone'
            | 'sighting'
            | 'achievement'
            | 'challenge';
          source_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason: string;
          source_type:
            | 'walk'
            | 'walk_distance'
            | 'steps_milestone'
            | 'sighting'
            | 'achievement'
            | 'challenge';
          source_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          reason?: string;
          source_type?:
            | 'walk'
            | 'walk_distance'
            | 'steps_milestone'
            | 'sighting'
            | 'achievement'
            | 'challenge';
          source_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string;
          title: string;
          description: string;
          icon: string;
          points: number;
          metric:
            | 'walks_count'
            | 'total_distance_m'
            | 'cats_count'
            | 'weekly_active_days';
          threshold: number;
          sort_order: number;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          icon: string;
          points: number;
          metric:
            | 'walks_count'
            | 'total_distance_m'
            | 'cats_count'
            | 'weekly_active_days';
          threshold: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          icon?: string;
          points?: number;
          metric?:
            | 'walks_count'
            | 'total_distance_m'
            | 'cats_count'
            | 'weekly_active_days';
          threshold?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          unlocked_at?: string;
        };
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          period: 'daily' | 'weekly';
          metric:
            | 'walks'
            | 'distance_m'
            | 'moving_time_s'
            | 'steps'
            | 'active_days'
            | 'sightings';
          target: number;
          easy_target: number;
          title: string;
          easy_title: string;
          description: string;
          icon: string;
          difficulty: 'easy' | 'standard';
          sort_order: number;
        };
        Insert: {
          id: string;
          period: 'daily' | 'weekly';
          metric:
            | 'walks'
            | 'distance_m'
            | 'moving_time_s'
            | 'steps'
            | 'active_days'
            | 'sightings';
          target: number;
          easy_target: number;
          title: string;
          easy_title: string;
          description: string;
          icon?: string;
          difficulty?: 'easy' | 'standard';
          sort_order?: number;
        };
        Update: {
          id?: string;
          period?: 'daily' | 'weekly';
          metric?:
            | 'walks'
            | 'distance_m'
            | 'moving_time_s'
            | 'steps'
            | 'active_days'
            | 'sightings';
          target?: number;
          easy_target?: number;
          title?: string;
          easy_title?: string;
          description?: string;
          icon?: string;
          difficulty?: 'easy' | 'standard';
          sort_order?: number;
        };
        Relationships: [];
      };
      challenge_instances: {
        Row: {
          id: string;
          challenge_id: string;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          period_start: string;
          period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          period_start?: string;
          period_end?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      challenge_progress: {
        Row: {
          id: string;
          user_id: string;
          instance_id: string;
          progress: number;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          instance_id: string;
          progress?: number;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          instance_id?: string;
          progress?: number;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: 'pending' | 'accepted' | 'declined' | 'blocked';
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: 'pending' | 'accepted' | 'declined' | 'blocked';
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          requester_id?: string;
          addressee_id?: string;
          status?: 'pending' | 'accepted' | 'declined' | 'blocked';
          created_at?: string;
          responded_at?: string | null;
        };
        Relationships: [];
      };
      friend_invites: {
        Row: {
          code: string;
          user_id: string;
          expires_at: string;
          uses: number;
          max_uses: number;
          created_at: string;
        };
        Insert: {
          code: string;
          user_id: string;
          expires_at?: string;
          uses?: number;
          max_uses?: number;
          created_at?: string;
        };
        Update: {
          code?: string;
          user_id?: string;
          expires_at?: string;
          uses?: number;
          max_uses?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_events: {
        Row: {
          id: string;
          user_id: string;
          type:
            | 'walk_completed'
            | 'achievement_unlocked'
            | 'collection_milestone'
            | 'challenge_completed'
            | 'cat_card_shared';
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type:
            | 'walk_completed'
            | 'achievement_unlocked'
            | 'collection_milestone'
            | 'challenge_completed'
            | 'cat_card_shared';
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?:
            | 'walk_completed'
            | 'achievement_unlocked'
            | 'collection_milestone'
            | 'challenge_completed'
            | 'cat_card_shared';
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      reactions: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          emoji: '👏' | '🐾' | '❤️' | '🔥';
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          emoji: '👏' | '🐾' | '❤️' | '🔥';
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          emoji?: '👏' | '🐾' | '❤️' | '🔥';
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_username_available: {
        Args: {
          p_username: string;
        };
        Returns: boolean;
      };
      get_activity_summary: {
        Args: {
          p_from: string;
          p_to: string;
          p_tz_offset_minutes?: number;
        };
        Returns: {
          date: string;
          walks_count: number;
          distance_m: number;
          moving_time_s: number;
          steps: number;
        }[];
      };
      hamming_distance: {
        Args: {
          a: string;
          b: string;
        };
        Returns: number;
      };
      link_sighting_to_cat: {
        Args: {
          p_sighting_id: string;
          p_cat_id: string;
        };
        Returns: string;
      };
      unlink_sighting: {
        Args: {
          p_sighting_id: string;
        };
        Returns: string;
      };
      get_points_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_points: number;
          week_points: number;
          today_points: number;
        }[];
      };
      ensure_active_challenge_instances: {
        Args: {
          p_date?: string;
        };
        Returns: undefined;
      };
      set_challenge_difficulty: {
        Args: {
          p_difficulty: string;
        };
        Returns: string;
      };
      is_friend: {
        Args: {
          p_a: string;
          p_b: string;
        };
        Returns: boolean;
      };
      is_blocked_between: {
        Args: {
          p_a: string;
          p_b: string;
        };
        Returns: boolean;
      };
      create_friend_invite: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Tables']['friend_invites']['Row'];
      };
      redeem_friend_invite: {
        Args: {
          p_code: string;
        };
        Returns: string;
      };
      search_discoverable_users: {
        Args: {
          p_query: string;
        };
        Returns: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          friendship_status: string | null;
        }[];
      };
      send_friend_request: {
        Args: {
          p_target_user_id: string;
        };
        Returns: Database['public']['Tables']['friendships']['Row'];
      };
      respond_friend_request: {
        Args: {
          p_friendship_id: string;
          p_decision: string;
        };
        Returns: Database['public']['Tables']['friendships']['Row'];
      };
      remove_or_cancel_friendship: {
        Args: {
          p_other_user_id: string;
        };
        Returns: undefined;
      };
      block_user: {
        Args: {
          p_target_user_id: string;
        };
        Returns: undefined;
      };
      share_cat_card_to_friends: {
        Args: {
          p_cat_id: string;
        };
        Returns: Database['public']['Tables']['activity_events']['Row'];
      };
      get_friends_leaderboard: {
        Args: {
          p_metric: string;
          p_week_start?: string;
        };
        Returns: {
          rank: number;
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          value: number;
          is_self: boolean;
          has_outlier: boolean;
        }[];
      };
      get_friend_profile_summary: {
        Args: {
          p_friend_id: string;
        };
        Returns: {
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          member_since: string;
          achievements_count: number;
          show_on_leaderboard: boolean;
          week_steps: number;
          week_distance_m: number;
          week_walks: number;
          week_challenge_points: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
