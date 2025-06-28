/*
  # Add Forum System

  1. New Tables
    - `forum_posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - references users.id
      - `title` (text) - post title
      - `content` (text) - post content
      - `category` (text) - post category
      - `is_pinned` (boolean) - whether post is pinned
      - `likes_count` (integer) - number of likes
      - `replies_count` (integer) - number of replies
      - `created_at` (timestamptz)

    - `forum_replies`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - references users.id
      - `post_id` (uuid, foreign key) - references forum_posts.id
      - `content` (text) - reply content
      - `created_at` (timestamptz)

    - `forum_likes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - references users.id
      - `post_id` (uuid, foreign key) - references forum_posts.id
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all forum tables
    - Add policies for authenticated users to manage their own content
    - Add policies for public read access
*/

-- Create forum posts table
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  is_pinned boolean DEFAULT false,
  likes_count integer DEFAULT 0,
  replies_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create forum replies table
CREATE TABLE IF NOT EXISTS forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create forum likes table
CREATE TABLE IF NOT EXISTS forum_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable Row Level Security
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_likes ENABLE ROW LEVEL SECURITY;

-- Forum posts policies
CREATE POLICY "Anyone can read forum posts"
  ON forum_posts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own forum posts"
  ON forum_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own forum posts"
  ON forum_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own forum posts"
  ON forum_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Forum replies policies
CREATE POLICY "Anyone can read forum replies"
  ON forum_replies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own forum replies"
  ON forum_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own forum replies"
  ON forum_replies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own forum replies"
  ON forum_replies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Forum likes policies
CREATE POLICY "Users can read all forum likes"
  ON forum_likes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own forum likes"
  ON forum_likes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_likes_count ON forum_posts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post_id ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user_id ON forum_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_likes_post_id ON forum_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_likes_user_id ON forum_likes(user_id);