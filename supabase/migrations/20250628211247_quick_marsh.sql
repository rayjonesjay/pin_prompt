/*
  # Add Messaging and Notifications System

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, foreign key) - references users.id
      - `receiver_id` (uuid, foreign key) - references users.id
      - `content` (text) - message content
      - `is_read` (boolean) - whether message has been read
      - `created_at` (timestamptz)

    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - references users.id (recipient)
      - `type` (text) - notification type: 'like', 'follow', 'message', 'comment'
      - `title` (text) - notification title
      - `message` (text) - notification message
      - `related_id` (uuid) - ID of related entity (prompt_id, user_id, etc.)
      - `is_read` (boolean) - whether notification has been read
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage their own messages and notifications
*/

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CHECK (sender_id != receiver_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('like', 'follow', 'message', 'comment')),
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can read their own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);

-- Notifications policies
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  recipient_id uuid,
  notification_type text,
  notification_title text,
  notification_message text,
  entity_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (recipient_id, notification_type, notification_title, notification_message, entity_id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, text, text, uuid) TO authenticated;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(notification_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE id = ANY(notification_ids) AND user_id = auth.uid();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_notifications_read(uuid[]) TO authenticated;