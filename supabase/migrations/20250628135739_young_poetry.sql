/*
  # PinPrompt Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - matches auth.users id
      - `username` (text, unique) - user's chosen username
      - `email` (text, unique) - user's email address
      - `avatar_url` (text, optional) - profile picture URL
      - `bio` (text, optional) - user bio/description
      - `followers_count` (integer) - number of followers
      - `following_count` (integer) - number of users following
      - `created_at` (timestamptz) - account creation date

    - `prompts`
      - `id` (uuid, primary key) - unique prompt identifier
      - `user_id` (uuid, foreign key) - references users.id
      - `prompt_text` (text) - the actual prompt used
      - `output_url` (text, optional) - URL to the generated output
      - `output_type` (enum) - type of output: image, video, text, audio
      - `llm_model` (text) - the LLM model used
      - `category` (text, optional) - content category
      - `likes_count` (integer) - number of likes
      - `created_at` (timestamptz) - prompt creation date

    - `likes`
      - `id` (uuid, primary key) - unique like identifier
      - `user_id` (uuid, foreign key) - references users.id
      - `prompt_id` (uuid, foreign key) - references prompts.id
      - `created_at` (timestamptz) - when the like was created

    - `follows`
      - `id` (uuid, primary key) - unique follow relationship identifier
      - `follower_id` (uuid, foreign key) - user who is following
      - `following_id` (uuid, foreign key) - user being followed
      - `created_at` (timestamptz) - when the follow relationship was created

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for public read access where appropriate
*/

-- Create custom types
CREATE TYPE output_type AS ENUM ('image', 'video', 'text', 'audio');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  prompt_text text NOT NULL,
  output_url text,
  output_type output_type NOT NULL,
  llm_model text NOT NULL,
  category text,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  prompt_id uuid REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, prompt_id)
);

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Prompts policies
CREATE POLICY "Anyone can read prompts"
  ON prompts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own prompts"
  ON prompts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON prompts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON prompts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Users can read all likes"
  ON likes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own likes"
  ON likes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Users can read all follows"
  ON follows
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own follows"
  ON follows
  FOR ALL
  TO authenticated
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_likes_count ON prompts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_prompt_id ON likes(prompt_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- Create storage bucket for outputs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('outputs', 'outputs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view outputs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'outputs');

CREATE POLICY "Authenticated users can upload outputs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'outputs');

CREATE POLICY "Users can update own outputs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own outputs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);