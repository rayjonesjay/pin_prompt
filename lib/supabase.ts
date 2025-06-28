import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          created_at: string;
          avatar_url?: string;
          bio?: string;
          followers_count: number;
          following_count: number;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          created_at?: string;
          avatar_url?: string;
          bio?: string;
          followers_count?: number;
          following_count?: number;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          created_at?: string;
          avatar_url?: string;
          bio?: string;
          followers_count?: number;
          following_count?: number;
        };
      };
      prompts: {
        Row: {
          id: string;
          user_id: string;
          prompt_text: string;
          output_url?: string;
          output_type: 'image' | 'video' | 'text' | 'audio';
          llm_model: string;
          category?: string;
          likes_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prompt_text: string;
          output_url?: string;
          output_type: 'image' | 'video' | 'text' | 'audio';
          llm_model: string;
          category?: string;
          likes_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prompt_text?: string;
          output_url?: string;
          output_type?: 'image' | 'video' | 'text' | 'audio';
          llm_model?: string;
          category?: string;
          likes_count?: number;
          created_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          prompt_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prompt_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prompt_id?: string;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
    };
  };
};