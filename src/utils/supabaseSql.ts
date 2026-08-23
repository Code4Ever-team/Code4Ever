export const SUPABASE_SETUP_SQL = `-- ================================================================
-- Code4Ever Supabase PostgreSQL Schema & Security Architecture
-- ================================================================

-- 1. Profiles Table (Kullanıcı Profilleri)
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

-- 2. Posts Table (Sosyal Akış, Kod & Kategori Paylaşımları)
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

-- Migration scripts for existing tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='bookmarked_by') THEN
    ALTER TABLE public.posts ADD COLUMN bookmarked_by JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='reposted_by') THEN
    ALTER TABLE public.posts ADD COLUMN reposted_by JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='reposts_count') THEN
    ALTER TABLE public.posts ADD COLUMN reposts_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='code_language') THEN
    ALTER TABLE public.posts ADD COLUMN code_language TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='category_name') THEN
    ALTER TABLE public.posts ADD COLUMN category_name TEXT DEFAULT 'Genel & Sohbet';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='community_handle') THEN
    ALTER TABLE public.posts ADD COLUMN community_handle TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='is_deleted') THEN
    ALTER TABLE public.posts ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 3. Communities Table (Topluluklar & API Entegrasyonu)
CREATE TABLE IF NOT EXISTS public.communities (
  id TEXT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  handle VARCHAR(30) UNIQUE NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  description VARCHAR(500),
  members_count INTEGER DEFAULT 0,
  created_by TEXT,
  creator_username TEXT,
  api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='communities' AND column_name='api_key') THEN
    ALTER TABLE public.communities ADD COLUMN api_key TEXT;
  END IF;
END $$;

-- 4. Job Listings Table (İş & Ekip İlanları)
CREATE TABLE IF NOT EXISTS public.job_listings (
  id TEXT PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('job', 'team')),
  title VARCHAR(120) NOT NULL,
  description VARCHAR(4000) NOT NULL,
  quota INTEGER NOT NULL DEFAULT 1 CHECK (quota >= 1 AND quota <= 500),
  author JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  applications JSONB DEFAULT '[]'::jsonb,
  applied_by JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Job Applications Table (İlan Başvuruları)
CREATE TABLE IF NOT EXISTS public.job_applications (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES public.job_listings(id) ON DELETE CASCADE,
  applicant_id TEXT NOT NULL,
  applicant_username TEXT NOT NULL,
  name VARCHAR(60) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 13 AND age <= 100),
  experience VARCHAR(250) NOT NULL,
  languages VARCHAR(250) NOT NULL,
  description VARCHAR(3000) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notifications Table (Bildirimler)
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL,
  type VARCHAR(30) NOT NULL,
  actor JSONB NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  target_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Groups Table (Gruplar)
CREATE TABLE IF NOT EXISTS public.groups (
  id TEXT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  avatar_url TEXT NOT NULL,
  description VARCHAR(500),
  creator_id TEXT NOT NULL,
  creator_username TEXT NOT NULL,
  admins JSONB DEFAULT '[]'::jsonb,
  members JSONB DEFAULT '[]'::jsonb,
  last_message JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Messages Table (E2EE Şifreli Mesajlar)
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  is_group BOOLEAN DEFAULT false,
  sender_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  sender_display_name TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type VARCHAR(20),
  media_name TEXT,
  status VARCHAR(20) DEFAULT 'delivered',
  encryption_duration_ms NUMERIC DEFAULT 0,
  reply_to JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Group Invites Table (Grup Davetleri)
CREATE TABLE IF NOT EXISTS public.group_invites (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  group_name VARCHAR(60) NOT NULL,
  group_avatar TEXT,
  group_description VARCHAR(500),
  invited_by_username TEXT NOT NULL,
  invited_by_name TEXT NOT NULL,
  invited_by_avatar TEXT,
  target_username TEXT NOT NULL,
  target_user_id TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. System Error Reports Table (Platform & Webhook Hata Raporlama)
CREATE TABLE IF NOT EXISTS public.system_error_reports (
  id TEXT PRIMARY KEY,
  error_type TEXT NOT NULL DEFAULT 'general_issue',
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  logs TEXT,
  reporter_username TEXT NOT NULL,
  reporter_display_name TEXT,
  reporter_avatar TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Post Reports Table (Gönderi İhlal, Spam & Reklam Şikayetleri)
CREATE TABLE IF NOT EXISTS public.post_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  post_author_username TEXT NOT NULL,
  post_content TEXT NOT NULL,
  reporter_username TEXT NOT NULL,
  reporter_display_name TEXT,
  reason TEXT NOT NULL DEFAULT 'other',
  reason_label TEXT DEFAULT 'İhlal / Şikayet',
  details TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) & FULL PERMISSIONS FOR ALL ROLES
-- ================================================================

-- 1. Explicit Schema and Table Grants for Anon & Authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Enable Full Replica Identity for Realtime Delete/Update tracking
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.job_listings REPLICA IDENTITY FULL;
ALTER TABLE public.communities REPLICA IDENTITY FULL;
ALTER TABLE public.system_error_reports REPLICA IDENTITY FULL;
ALTER TABLE public.post_reports REPLICA IDENTITY FULL;

-- 3. Enable Realtime Publications
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts, public.messages, public.job_listings, public.communities, public.notifications, public.system_error_reports, public.post_reports;
  EXCEPTION WHEN OTHERS THEN
    -- If already added or publication doesn't exist, continue safely
  END;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Full Access Policies for Public Client Apps (SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
  -- Profiles
  DROP POLICY IF EXISTS "allow_all_profiles" ON public.profiles;
  CREATE POLICY "allow_all_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
  
  -- Posts (Full SELECT, INSERT, UPDATE, DELETE)
  DROP POLICY IF EXISTS "allow_all_posts" ON public.posts;
  CREATE POLICY "allow_all_posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);

  -- Communities
  DROP POLICY IF EXISTS "allow_all_communities" ON public.communities;
  CREATE POLICY "allow_all_communities" ON public.communities FOR ALL USING (true) WITH CHECK (true);

  -- Job Listings
  DROP POLICY IF EXISTS "allow_all_job_listings" ON public.job_listings;
  CREATE POLICY "allow_all_job_listings" ON public.job_listings FOR ALL USING (true) WITH CHECK (true);

  -- Job Applications
  DROP POLICY IF EXISTS "allow_all_job_applications" ON public.job_applications;
  CREATE POLICY "allow_all_job_applications" ON public.job_applications FOR ALL USING (true) WITH CHECK (true);

  -- Notifications
  DROP POLICY IF EXISTS "allow_all_notifications" ON public.notifications;
  CREATE POLICY "allow_all_notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

  -- Groups
  DROP POLICY IF EXISTS "allow_all_groups" ON public.groups;
  CREATE POLICY "allow_all_groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);

  -- Messages
  DROP POLICY IF EXISTS "allow_all_messages" ON public.messages;
  CREATE POLICY "allow_all_messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

  -- Group Invites
  DROP POLICY IF EXISTS "allow_all_group_invites" ON public.group_invites;
  CREATE POLICY "allow_all_group_invites" ON public.group_invites FOR ALL USING (true) WITH CHECK (true);

  -- System Error Reports
  DROP POLICY IF EXISTS "allow_all_system_error_reports" ON public.system_error_reports;
  CREATE POLICY "allow_all_system_error_reports" ON public.system_error_reports FOR ALL USING (true) WITH CHECK (true);

  -- Post Reports
  DROP POLICY IF EXISTS "allow_all_post_reports" ON public.post_reports;
  CREATE POLICY "allow_all_post_reports" ON public.post_reports FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON public.posts(is_deleted);
CREATE INDEX IF NOT EXISTS idx_job_listings_created_at ON public.job_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_system_error_reports_created_at ON public.system_error_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reports_created_at ON public.post_reports(created_at DESC);

`;
