/*
  # Fix Forum Likes and Add Comments System

  1. New Tables
    - `forum_comments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - references users.id
      - `post_id` (uuid, foreign key) - references forum_posts.id
      - `content` (text) - comment content
      - `created_at` (timestamptz)

  2. Functions
    - `increment_forum_likes(post_id)` - Safely increments forum post likes
    - `decrement_forum_likes(post_id)` - Safely decrements forum post likes

  3. Security
    - Enable RLS on forum_comments table
    - Add policies for authenticated users to manage their own comments
    - Add policies for public read access
*/

-- Create forum comments table
CREATE TABLE IF NOT EXISTS forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

-- Forum comments policies
CREATE POLICY "Anyone can read forum comments"
  ON forum_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own forum comments"
  ON forum_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own forum comments"
  ON forum_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own forum comments"
  ON forum_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forum_comments_post_id ON forum_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_user_id ON forum_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_created_at ON forum_comments(created_at DESC);

-- Function to increment forum post likes count
CREATE OR REPLACE FUNCTION increment_forum_likes(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_posts
  SET likes_count = likes_count + 1
  WHERE id = increment_forum_likes.post_id;
  
  -- Check if the update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forum post with id % not found', post_id;
  END IF;
END;
$$;

-- Function to decrement forum post likes count (with minimum of 0)
CREATE OR REPLACE FUNCTION decrement_forum_likes(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_posts
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = decrement_forum_likes.post_id;
  
  -- Check if the update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forum post with id % not found', post_id;
  END IF;
END;
$$;

-- Function to increment forum post replies count
CREATE OR REPLACE FUNCTION increment_forum_replies(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_posts
  SET replies_count = replies_count + 1
  WHERE id = increment_forum_replies.post_id;
  
  -- Check if the update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forum post with id % not found', post_id;
  END IF;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_forum_likes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_forum_likes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_forum_replies(uuid) TO authenticated;