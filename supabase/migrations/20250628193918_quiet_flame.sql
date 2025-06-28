/*
  # Create Like Management Functions

  1. New Functions
    - `increment_likes(prompt_id)` - Safely increments the likes count for a prompt
    - `decrement_likes(prompt_id)` - Safely decrements the likes count for a prompt (with minimum of 0)
  
  2. Security
    - Functions are accessible to authenticated users
    - Includes proper error handling and constraints
*/

-- Function to increment likes count
CREATE OR REPLACE FUNCTION increment_likes(prompt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE prompts
  SET likes_count = likes_count + 1
  WHERE id = increment_likes.prompt_id;
  
  -- Check if the update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prompt with id % not found', prompt_id;
  END IF;
END;
$$;

-- Function to decrement likes count (with minimum of 0)
CREATE OR REPLACE FUNCTION decrement_likes(prompt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE prompts
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = decrement_likes.prompt_id;
  
  -- Check if the update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prompt with id % not found', prompt_id;
  END IF;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_likes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_likes(uuid) TO authenticated;