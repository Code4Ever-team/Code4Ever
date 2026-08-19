-- ================================================================
-- Code4Ever Supabase PostgreSQL Schema & Security Architecture
-- ================================================================

-- 1. Profiles Table (Kullanıcı Profilleri)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Posts Table (Sosyal Akış & Kod Paylaşımları)
CREATE TABLE IF NOT EXISTS public.posts (
  id TEXT PRIMARY KEY,
  author JSONB NOT NULL,
  content VARCHAR(200) NOT NULL,
  code_snippet VARCHAR(2000),
  code_language TEXT,
  likes_count INTEGER DEFAULT 0,
  liked_by JSONB DEFAULT '[]'::jsonb,
  comments_count INTEGER DEFAULT 0,
  comments JSONB DEFAULT '[]'::jsonb,
  reposts_count INTEGER DEFAULT 0,
  reposted_by JSONB DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Communities Table (Topluluklar)
CREATE TABLE IF NOT EXISTS public.communities (
  id TEXT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  handle VARCHAR(30) UNIQUE NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  description VARCHAR(250),
  members_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Job Listings Table (İş & Ekip İlanları)
CREATE TABLE IF NOT EXISTS public.job_listings (
  id TEXT PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('job', 'team')),
  title VARCHAR(120) NOT NULL,
  description VARCHAR(3000) NOT NULL,
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
  experience VARCHAR(150) NOT NULL,
  languages VARCHAR(150) NOT NULL,
  description VARCHAR(2000) NOT NULL,
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

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Read policies (Herkese Açık Okuma)
CREATE POLICY "Public read access for profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public read access for posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Public read access for communities" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Public read access for job listings" ON public.job_listings FOR SELECT USING (true);

-- Insert/Update policies
CREATE POLICY "Authenticated users can insert posts" ON public.posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update their posts" ON public.posts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create job listings" ON public.job_listings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can apply to job listings" ON public.job_applications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_listings_created_at ON public.job_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
