-- SQL for Orion Communication Module
-- Run this in your Supabase SQL Editor
-- IMPORTANT: Run these sections in order if you encounter errors.

-- ==========================================
-- 0. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CREATE TABLES (CORE)
-- ==========================================

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1 UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2 UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1, user2)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  type TEXT CHECK (type IN ('text', 'file', 'image', 'transmission')) DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create global_messages table
CREATE TABLE IF NOT EXISTS global_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  type TEXT CHECK (type IN ('text', 'file', 'image', 'transmission')) DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('message', 'mention', 'system')) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  link TEXT,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- ==========================================
-- 2. ADD COLUMNS / MIGRATIONS
-- ==========================================

-- Add status to messages if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('sent', 'delivered')) DEFAULT 'sent';

-- Add avatar_url to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ==========================================
-- 3. ENABLE REALTIME
-- ==========================================

-- Note: If these fail because the table is already in the publication, 
-- you can ignore the error or remove the table from the publication first.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE global_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ==========================================
-- 4. RLS POLICIES
-- ==========================================

-- Chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats" ON chats
  FOR SELECT USING (auth.uid() = user1 OR auth.uid() = user2);

CREATE POLICY "Users can create chats" ON chats
  FOR INSERT WITH CHECK (auth.uid() = user1 OR auth.uid() = user2);

-- Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their chats" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.user1 = auth.uid() OR chats.user2 = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their chats" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.user1 = auth.uid() OR chats.user2 = auth.uid())
    )
  );

-- Global Messages
ALTER TABLE global_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view global messages" ON global_messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert global messages" ON global_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System/Users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);
