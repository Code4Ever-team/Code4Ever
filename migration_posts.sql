-- ==============================================================================
-- Code4Ever: Production Database Migration & Schema Fix for 'posts' & 'profiles'
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Ensure Profiles table exists and has all required columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'Geliştirici',
  verified BOOLEAN DEFAULT false,
  email TEXT,
  theme_color TEXT DEFAULT '#09090b',
  accent_color TEXT DEFAULT '#3b82f6',
  joined_communities JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{"github": "github.com", "location": "Türkiye"}'::jsonb,
  is_admin BOOLEAN DEFAULT false,
  saved_post_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add missing columns to profiles if table existed previously
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='saved_post_ids') THEN
    ALTER TABLE public.profiles ADD COLUMN saved_post_ids JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin') THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='joined_communities') THEN
    ALTER TABLE public.profiles ADD COLUMN joined_communities JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 2. Ensure Posts table exists with all required columns
CREATE TABLE IF NOT EXISTS public.posts (
  id TEXT PRIMARY KEY,
  author JSONB NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  category_name TEXT DEFAULT 'Genel & Sohbet',
  code_snippet TEXT,
  code_language TEXT,
  media_url TEXT,
  media_type TEXT,
  project_card JSONB,
  community_id TEXT,
  community_name TEXT,
  community_handle TEXT,
  likes_count INTEGER DEFAULT 0,
  liked_by JSONB DEFAULT '[]'::jsonb,
  comments_count INTEGER DEFAULT 0,
  comments JSONB DEFAULT '[]'::jsonb,
  reposts_count INTEGER DEFAULT 0,
  reposted_by JSONB DEFAULT '[]'::jsonb,
  bookmarked_by JSONB DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRITICAL MIGRATION: Add all potentially missing columns to existing 'posts' table
DO $$
BEGIN
  -- bookmarked_by column (Fixes 'Could not find the bookmarked_by column of posts in the schema cache')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='bookmarked_by') THEN
    ALTER TABLE public.posts ADD COLUMN bookmarked_by JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- reposted_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='reposted_by') THEN
    ALTER TABLE public.posts ADD COLUMN reposted_by JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- reposts_count column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='reposts_count') THEN
    ALTER TABLE public.posts ADD COLUMN reposts_count INTEGER DEFAULT 0;
  END IF;

  -- code_language column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='code_language') THEN
    ALTER TABLE public.posts ADD COLUMN code_language TEXT;
  END IF;

  -- category_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='category_name') THEN
    ALTER TABLE public.posts ADD COLUMN category_name TEXT DEFAULT 'Genel & Sohbet';
  END IF;

  -- community_handle column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='community_handle') THEN
    ALTER TABLE public.posts ADD COLUMN community_handle TEXT;
  END IF;

  -- is_pinned column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='is_pinned') THEN
    ALTER TABLE public.posts ADD COLUMN is_pinned BOOLEAN DEFAULT false;
  END IF;

  -- is_deleted column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='is_deleted') THEN
    ALTER TABLE public.posts ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;

  -- likes_count & liked_by fallback
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='liked_by') THEN
    ALTER TABLE public.posts ADD COLUMN liked_by JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='comments') THEN
    ALTER TABLE public.posts ADD COLUMN comments JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 4. Enable Full Replica Identity for Realtime Delete & Update Broadcasts
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 5. Realtime Publication Setup
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  EXCEPTION WHEN OTHERS THEN
    -- Continue if already registered
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN OTHERS THEN
    -- Continue if already registered
  END;
END $$;

-- 6. Row Level Security (RLS) Configuration & Public Access Policies
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "allow_all_posts" ON public.posts;
CREATE POLICY "allow_all_posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_profiles" ON public.profiles;
CREATE POLICY "allow_all_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 7. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON public.posts(is_deleted);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 8. Force Schema Cache Reload in PostgREST
NOTIFY pgrst, 'reload schema';
