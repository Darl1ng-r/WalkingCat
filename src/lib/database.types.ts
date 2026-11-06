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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_username_available: {
        Args: {
          p_username: string;
        };
        Returns: boolean;
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
