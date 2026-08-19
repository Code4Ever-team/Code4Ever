import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import {
  UserProfile,
  Post,
  PostComment,
  Community,
  JobListing,
  JobApplication,
  NotificationItem,
  ClosedBetaSettings,
  SubscriptionPlan,
  BadgeDefinition,
  PlatformSettings
} from '../types';
import { sanitizeText, sanitizeUrl } from '../utils/securityHelper';

// Read Supabase credentials from environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    } catch (e) {
      console.warn('Supabase client initialization fallback to storage:', e);
    }
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();

// Local Storage Cache Keys
export const STORAGE_KEYS = {
  PROFILE: 'c4e_supabase_user_profile',
  POSTS: 'c4e_supabase_posts',
  COMMUNITIES: 'c4e_supabase_communities',
  JOB_LISTINGS: 'c4e_supabase_job_listings',
  NOTIFICATIONS: 'c4e_supabase_notifications',
  GH_TOKEN: 'c4e_gh_access_token',
  LANG: 'c4e_lang',
  CLOSED_BETA: 'c4e_closed_beta_settings',
  SUBSCRIPTIONS: 'c4e_subscription_plans',
  BADGES: 'c4e_badge_definitions',
  PLATFORM: 'c4e_platform_settings'
};

export const DEFAULT_USER: UserProfile = {
  id: '',
  username: '',
  display_name: '',
  avatar_url: '',
  banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  bio: '',
  role: 'Geliştirici',
  verified: false,
  theme_color: '#09090b',
  accent_color: '#3b82f6',
  joined_communities: [],
  custom_fields: {
    github: 'github.com',
    location: 'Türkiye'
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// -------------------------------------------------------------
// AUTHENTICATION (SUPABASE OAUTH & SESSION)
// -------------------------------------------------------------

export async function signInWithGitHubSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  } else {
    // Demo / fallback mode if Supabase URL is not yet configured
    const demoUser: UserProfile = {
      ...DEFAULT_USER,
      id: `usr_${Date.now()}`,
      username: 'c4e_developer',
      display_name: 'C4E Developer',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Code4Ever topluluk üyesi ve açık kaynak geliştiricisi.',
      role: 'Geliştirici',
      verified: false
    };
    saveStoredProfile(demoUser);
    window.location.reload();
  }
}

export async function logoutSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
  localStorage.removeItem(STORAGE_KEYS.GH_TOKEN);
}

export function formatSupabaseUserToProfile(user: SupabaseUser): UserProfile {
  const metadata = user.user_metadata || {};
  const username =
    metadata.user_name ||
    metadata.preferred_username ||
    metadata.name?.toLowerCase().replace(/\s+/g, '_') ||
    user.email?.split('@')[0] ||
    'developer';

  return {
    id: user.id,
    username: username.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    display_name: metadata.full_name || metadata.name || username,
    avatar_url: metadata.avatar_url || metadata.picture || `https://unavatar.io/github/${username}`,
    banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    bio: metadata.bio || 'Ben Code4Ever Kullanıyorum!',
    role: 'Açık Kaynak Geliştirici',
    verified: false,
    email: user.email || undefined,
    joined_communities: [],
    custom_fields: {
      github: `github.com/${username}`,
      location: 'Türkiye'
    },
    created_at: user.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export async function getOrFormatUserProfile(user: SupabaseUser): Promise<UserProfile> {
  const defaultProfile = formatSupabaseUserToProfile(user);
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data && !error) {
        return {
          ...defaultProfile,
          ...data,
          id: user.id
        };
      } else {
        // Insert initial profile to Supabase PostgreSQL
        await client.from('profiles').upsert({
          id: user.id,
          username: defaultProfile.username,
          display_name: defaultProfile.display_name,
          avatar_url: defaultProfile.avatar_url,
          banner_url: defaultProfile.banner_url,
          bio: defaultProfile.bio,
          role: defaultProfile.role,
          verified: defaultProfile.verified,
          email: defaultProfile.email,
          created_at: defaultProfile.created_at,
          updated_at: defaultProfile.updated_at
        });
      }
    } catch (err) {
      console.warn('Supabase profile fetch error:', err);
    }
  }

  const localStored = loadStoredProfile();
  if (localStored && localStored.id === user.id) {
    return { ...defaultProfile, ...localStored };
  }

  saveStoredProfile(defaultProfile);
  return defaultProfile;
}

// -------------------------------------------------------------
// POSTS (FEED & CODE SNIPPETS)
// -------------------------------------------------------------

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post_1',
    author: {
      username: 'c4e_core',
      display_name: 'Code4Ever Core',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    time_ago: '1 saat önce',
    content: 'Code4Ever Supabase PostgreSQL altyapısına başarıyla geçirildi! 🚀 Hızlı sorgular, sağlam güvenlik kuralları ve yeni iş ilanları modülü aktif.',
    code_snippet: {
      title: 'Supabase Config',
      language: 'typescript',
      code: 'import { createClient } from "@supabase/supabase-js";\n\nexport const supabase = createClient(\n  process.env.SUPABASE_URL,\n  process.env.SUPABASE_ANON_KEY\n);'
    },
    likes_count: 8,
    comments_count: 2,
    reposts_count: 3,
    is_liked: false,
    is_reposted: false,
    is_bookmarked: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    comments: [
      {
        id: 'c1',
        author: {
          username: 'nylithra',
          display_name: 'Nylithra',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
        },
        content: 'PostgreSQL mimarisi harika çalışıyor! ⚡️',
        created_at: new Date(Date.now() - 1800000).toISOString()
      }
    ]
  }
];

export function loadStoredPosts(): Post[] {
  const data = localStorage.getItem(STORAGE_KEYS.POSTS);
  if (data) {
    try {
      const parsed: Post[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Fallback
    }
  }
  return INITIAL_POSTS;
}

export function saveStoredPosts(posts: Post[]): void {
  localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
}

export function subscribeToPosts(onUpdate: (posts: Post[]) => void): () => void {
  const client = getSupabaseClient();
  if (!client) {
    onUpdate(loadStoredPosts());
    return () => {};
  }

  // Fetch initial posts from Supabase PostgreSQL
  client
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        saveStoredPosts(data as Post[]);
        onUpdate(data as Post[]);
      } else {
        onUpdate(loadStoredPosts());
      }
    });

  // Realtime subscription via Supabase Channels
  const channel = client
    .channel('public:posts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async () => {
      const { data } = await client
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) {
        saveStoredPosts(data as Post[]);
        onUpdate(data as Post[]);
      }
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export async function createPostInSupabase(post: Post): Promise<void> {
  const current = loadStoredPosts();
  const updated = [post, ...current.filter((p) => p.id !== post.id)];
  saveStoredPosts(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('posts').upsert({
        id: post.id,
        author: post.author,
        content: sanitizeText(post.content, 4000),
        code_snippet: post.code_snippet || null,
        media_url: post.media_url || null,
        media_type: post.media_type || null,
        project_card: post.project_card || null,
        community_id: post.community_id || null,
        community_name: post.community_name || null,
        community_handle: post.community_handle || null,
        likes_count: post.likes_count || 0,
        liked_by: post.liked_by || [],
        comments_count: post.comments_count || 0,
        comments: post.comments || [],
        reposts_count: post.reposts_count || 0,
        reposted_by: post.reposted_by || [],
        created_at: post.created_at
      });
    } catch (err) {
      console.warn('Supabase post creation error:', err);
    }
  }
}

export async function updatePostInSupabase(postId: string, updateData: Partial<Post>): Promise<void> {
  const current = loadStoredPosts();
  const updated = current.map((p) => (p.id === postId ? { ...p, ...updateData } : p));
  saveStoredPosts(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('posts').update(updateData).eq('id', postId);
    } catch (err) {
      console.warn('Supabase post update error:', err);
    }
  }
}

export async function deletePostInSupabase(postId: string): Promise<void> {
  const current = loadStoredPosts();
  const updated = current.filter((p) => p.id !== postId);
  saveStoredPosts(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('posts').delete().eq('id', postId);
    } catch (err) {
      console.warn('Supabase post delete error:', err);
    }
  }
}

// -------------------------------------------------------------
// COMMUNITIES
// -------------------------------------------------------------

export const INITIAL_COMMUNITIES: Community[] = [
  {
    id: 'comm_ts',
    name: 'TypeScript & JavaScript',
    handle: 'typescript',
    avatar_url: 'https://images.unsplash.com/photo-1516116211227-bbc15456f916?w=200&auto=format&fit=crop&q=80',
    banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    description: 'Modern web, Node.js ve tip güvenli JavaScript geliştiricileri.',
    members_count: 142,
    is_joined: false
  },
  {
    id: 'comm_sec',
    name: 'Siber Güvenlik & DevSecOps',
    handle: 'cybersec',
    avatar_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80',
    banner_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80',
    description: 'Güvenli kodlama standartları, tersine mühendislik ve zafiyet analizleri.',
    members_count: 98,
    is_joined: false
  }
];

export function loadStoredCommunities(): Community[] {
  const data = localStorage.getItem(STORAGE_KEYS.COMMUNITIES);
  if (data) {
    try {
      const parsed: Community[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Fallback
    }
  }
  return INITIAL_COMMUNITIES;
}

export function saveStoredCommunities(communities: Community[]): void {
  localStorage.setItem(STORAGE_KEYS.COMMUNITIES, JSON.stringify(communities));
}

export function subscribeToCommunities(onUpdate: (communities: Community[]) => void): () => void {
  const client = getSupabaseClient();
  if (!client) {
    onUpdate(loadStoredCommunities());
    return () => {};
  }

  client
    .from('communities')
    .select('*')
    .then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        saveStoredCommunities(data as Community[]);
        onUpdate(data as Community[]);
      } else {
        onUpdate(loadStoredCommunities());
      }
    });

  const channel = client
    .channel('public:communities')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'communities' }, async () => {
      const { data } = await client.from('communities').select('*');
      if (data) {
        saveStoredCommunities(data as Community[]);
        onUpdate(data as Community[]);
      }
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export async function createCommunityInSupabase(comm: Community): Promise<void> {
  const current = loadStoredCommunities();
  const updated = [comm, ...current.filter((c) => c.id !== comm.id)];
  saveStoredCommunities(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('communities').upsert(comm);
    } catch (err) {
      console.warn('Supabase community create error:', err);
    }
  }
}

export async function updateCommunityInSupabase(commId: string, updateData: Partial<Community>): Promise<void> {
  const current = loadStoredCommunities();
  const updated = current.map((c) => (c.id === commId ? { ...c, ...updateData } : c));
  saveStoredCommunities(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('communities').update(updateData).eq('id', commId);
    } catch (err) {
      console.warn('Supabase community update error:', err);
    }
  }
}

export async function deleteCommunityFromSupabase(commId: string): Promise<void> {
  const current = loadStoredCommunities();
  const updated = current.filter((c) => c.id !== commId);
  saveStoredCommunities(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('communities').delete().eq('id', commId);
    } catch (err) {
      console.warn('Supabase community delete error:', err);
    }
  }
}

// -------------------------------------------------------------
// JOB & TEAM LISTINGS (SUPABASE POSTGRESQL)
// -------------------------------------------------------------

export const INITIAL_JOB_LISTINGS: JobListing[] = [
  {
    id: 'job_1',
    type: 'job',
    title: 'Senior Full-Stack TypeScript Geliştirici',
    description: 'Modern web mimarileri, React 19, Supabase PostgreSQL ve Node.js ekosisteminde deneyimli ekip arkadaşı arıyoruz. Uzaktan tam zamanlı çalışma imkanı.',
    quota: 2,
    author: {
      id: 'usr_c4e_core',
      username: 'code4ever_team',
      display_name: 'Code4Ever Core Team',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'Core Team'
    },
    status: 'active',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    time_ago: '5s',
    applications_count: 3,
    applications: [
      {
        id: 'app_sample_1',
        job_id: 'job_1',
        job_title: 'Senior Full-Stack TypeScript Geliştirici',
        applicant_user_id: 'usr_sample_1',
        applicant_username: 'mert_dev',
        applicant_display_name: 'Mert Yılmaz',
        applicant_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        name: 'Mert Yılmaz',
        age: 27,
        experience: '5 yıl React ve Node.js ekosisteminde kurumsal projeler geliştirdim.',
        languages: 'TypeScript, React, Node.js, PostgreSQL, Docker',
        description: 'Code4Ever açık kaynak ekosisteminde aktif olarak katkı sağlamak istiyorum.',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        time_ago: '2s'
      }
    ],
    applied_by: ['usr_sample_1']
  },
  {
    id: 'job_2',
    type: 'team',
    title: 'Açık Kaynak CLI & Güvenlik Aracı Geliştirme Ekibi',
    description: 'Geliştiriciler için terminal tabanlı statik analiz ve güvenlik tarama aracı geliştiriyoruz. Rust ve Go bilen 3 ekip üyesi arıyoruz.',
    quota: 3,
    author: {
      id: 'usr_sec_lead',
      username: 'cyber_guardian',
      display_name: 'Cyber Guardian',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      role: 'Security Lead'
    },
    status: 'active',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    time_ago: '12s',
    applications_count: 1,
    applications: [],
    applied_by: []
  }
];

export function loadStoredJobListings(): JobListing[] {
  const data = localStorage.getItem(STORAGE_KEYS.JOB_LISTINGS);
  if (data) {
    try {
      const parsed: JobListing[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Fallback
    }
  }
  return INITIAL_JOB_LISTINGS;
}

export function saveStoredJobListings(listings: JobListing[]): void {
  localStorage.setItem(STORAGE_KEYS.JOB_LISTINGS, JSON.stringify(listings));
}

export async function createJobListing(listing: JobListing): Promise<void> {
  const current = loadStoredJobListings();
  const updated = [listing, ...current.filter((j) => j.id !== listing.id)];
  saveStoredJobListings(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('job_listings').upsert({
        id: listing.id,
        type: listing.type,
        title: sanitizeText(listing.title),
        description: sanitizeText(listing.description),
        quota: listing.quota,
        author: listing.author,
        status: listing.status,
        created_at: listing.created_at,
        applications: listing.applications || [],
        applied_by: listing.applied_by || []
      });
    } catch (err) {
      console.warn('Supabase job listing sync error:', err);
    }
  }
}

export async function deleteJobListing(jobId: string): Promise<void> {
  const current = loadStoredJobListings();
  const updated = current.filter((j) => j.id !== jobId);
  saveStoredJobListings(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('job_listings').delete().eq('id', jobId);
    } catch (err) {
      console.warn('Supabase job listing delete error:', err);
    }
  }
}

export async function submitJobApplication(
  application: JobApplication,
  onNotifyAuthor?: (notification: NotificationItem) => void
): Promise<boolean> {
  const currentListings = loadStoredJobListings();
  const targetJob = currentListings.find((j) => j.id === application.job_id);
  if (!targetJob) return false;

  const cleanApp: JobApplication = {
    ...application,
    name: sanitizeText(application.name),
    experience: sanitizeText(application.experience),
    languages: sanitizeText(application.languages),
    description: sanitizeText(application.description)
  };

  const updatedApps = [...(targetJob.applications || []), cleanApp];
  const appliedBy = Array.from(
    new Set([...(targetJob.applied_by || []), application.applicant_user_id, application.applicant_username])
  );

  const updatedJob: JobListing = {
    ...targetJob,
    applications: updatedApps,
    applications_count: updatedApps.length,
    applied_by: appliedBy
  };

  const updatedListings = currentListings.map((j) => (j.id === targetJob.id ? updatedJob : j));
  saveStoredJobListings(updatedListings);

  if (onNotifyAuthor && targetJob.author.username !== application.applicant_username) {
    const notification: NotificationItem = {
      id: `notif_app_${Date.now()}`,
      type: 'job_application',
      actor: {
        username: application.applicant_username,
        display_name: application.applicant_display_name || application.name || application.applicant_username,
        avatar_url: application.applicant_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      },
      content: `"${targetJob.title}" başlıklı ${targetJob.type === 'team' ? 'ekip' : 'iş'} ilanınıza başvurdu.`,
      time_ago: 'Az önce',
      is_read: false,
      target_id: targetJob.id
    };
    onNotifyAuthor(notification);
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('job_applications').insert({
        id: cleanApp.id,
        job_id: cleanApp.job_id,
        applicant_id: cleanApp.applicant_user_id,
        applicant_username: cleanApp.applicant_username,
        name: cleanApp.name,
        age: cleanApp.age,
        experience: cleanApp.experience,
        languages: cleanApp.languages,
        description: cleanApp.description,
        created_at: cleanApp.created_at
      });
      await client.from('job_listings').update({
        applications: updatedApps,
        applied_by: appliedBy
      }).eq('id', targetJob.id);
    } catch (err) {
      console.warn('Supabase application sync error:', err);
    }
  }

  return true;
}

// -------------------------------------------------------------
// USER MANAGEMENT & PROFILES (ADMIN & REALTIME)
// -------------------------------------------------------------

export function loadStoredProfile(): UserProfile | null {
  const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

export function saveStoredProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

export function loadStoredAllUsers(): UserProfile[] {
  const local = loadStoredProfile();
  return local ? [local] : [];
}

export function subscribeToAllUsers(onUpdate: (users: UserProfile[]) => void): () => void {
  const client = getSupabaseClient();
  if (!client) {
    const local = loadStoredProfile();
    onUpdate(local ? [local] : []);
    return () => {};
  }

  client.from('profiles').select('*').then(({ data }) => {
    if (data) onUpdate(data as UserProfile[]);
  });

  const channel = client
    .channel('public:profiles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
      const { data } = await client.from('profiles').select('*');
      if (data) onUpdate(data as UserProfile[]);
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export async function updateUserProfileInSupabase(userId: string, updateData: Partial<UserProfile>): Promise<void> {
  const local = loadStoredProfile();
  if (local && local.id === userId) {
    saveStoredProfile({ ...local, ...updateData });
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('profiles').update(updateData).eq('id', userId);
    } catch (err) {
      console.warn('Supabase user profile update error:', err);
    }
  }
}

export async function deleteUserFromSupabase(userId: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('profiles').delete().eq('id', userId);
    } catch (err) {
      console.warn('Supabase user delete error:', err);
    }
  }
}

// -------------------------------------------------------------
// PLATFORM SETTINGS & CLOSED BETA
// -------------------------------------------------------------

export function loadStoredBetaSettings(): ClosedBetaSettings {
  const data = localStorage.getItem(STORAGE_KEYS.CLOSED_BETA);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return { isActive: false };
    }
  }
  return { isActive: false };
}

export function saveClosedBetaSettings(settings: ClosedBetaSettings): void {
  localStorage.setItem(STORAGE_KEYS.CLOSED_BETA, JSON.stringify(settings));
}

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_free',
    name: 'Geliştirici (Ücretsiz)',
    price: '₺0',
    period: 'Süresiz',
    description: 'Tüm açık kaynak geliştiriciler için temel sosyal akış ve kod paylaşım paketi.',
    features: ['Sınırsız Kod Paylaşımı', 'Açık Kaynak Topluluklarına Katılım', 'Genel Proje Vitrini'],
    badgeId: 'normal_user',
    badgeLabel: 'Normal Kullanıcı',
    badgeColor: '#71717a',
    badgeIcon: 'star',
    isActive: true
  },
  {
    id: 'plan_git_plus',
    name: 'Git+ Destekçi',
    price: '₺49',
    period: 'Aylık',
    description: 'Code4Ever açık kaynak ekosistemine katkı sağlayan ve profilini öne çıkarmak isteyen geliştiriciler için.',
    features: ['Git+ Turuncu Rozet', '100MB Tek Seferde Kod Yükleme', 'Özel Proje Vitrini Oluşturma', 'Topluluk Kurma & Yönetme Yetkisi'],
    badgeId: 'git_plus',
    badgeLabel: 'Git+',
    badgeColor: '#f97316',
    badgeIcon: 'git',
    isActive: true
  },
  {
    id: 'plan_enterprise',
    name: 'Code4Ever Enterprise',
    price: '₺199',
    period: 'Aylık',
    description: 'Topluluk liderleri, sponsorlar ve kıdemli geliştiriciler için tam yetki paketi.',
    features: ['Code4Ever Yetkilisi Rozeti', 'Tüm Pro & Git+ Özellikleri', 'Onaylı Topluluk Rozeti Tanımlama', 'Öncelikli 7/24 Destek Hattı'],
    badgeId: 'c4e_admin',
    badgeLabel: 'Code4Ever Yetkilisi',
    badgeColor: '#a855f7',
    badgeIcon: 'shield',
    isActive: true
  }
];

export function loadStoredSubscriptionPlans(): SubscriptionPlan[] {
  const data = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_SUBSCRIPTION_PLANS;
    }
  }
  return DEFAULT_SUBSCRIPTION_PLANS;
}

export function saveSubscriptionPlans(plans: SubscriptionPlan[]): void {
  localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(plans));
}

export const DEFAULT_BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'c4e_dev',
    label: 'Code4Ever Developer',
    description: 'Code4Ever platformunun geliştirilmesine katkıda bulunan yazılımcı rozeti.',
    color: '#ef4444',
    icon: 'code',
    weight: 10,
    isDefault: true
  },
  {
    id: 'c4e_admin',
    label: 'Code4Ever Yetkilisi',
    description: 'Code4Ever yönetim ekibine verilen resmi yetkili unvan rozeti.',
    color: '#a855f7',
    icon: 'shield',
    weight: 9,
    isDefault: true
  },
  {
    id: 'git_plus',
    label: 'Git+',
    description: 'Code4Ever projesine destek veren geliştiricilere verilen rozet.',
    color: '#f97316',
    icon: 'git',
    weight: 8,
    isDefault: true
  },
  {
    id: 'verified_dev',
    label: 'Doğrulanmış Geliştirici',
    description: 'Kimliği doğrulanmış üyelere verilen onay rozeti.',
    color: '#06b6d4',
    icon: 'check',
    weight: 8,
    isDefault: true
  },
  {
    id: 'normal_user',
    label: 'Normal Kullanıcı',
    description: 'Code4Ever kayıtlı aktif üye rozeti.',
    color: '#71717a',
    icon: 'star',
    weight: 1,
    isDefault: true
  }
];

export function loadStoredBadgeDefinitions(): BadgeDefinition[] {
  const data = localStorage.getItem(STORAGE_KEYS.BADGES);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_BADGE_DEFINITIONS;
    }
  }
  return DEFAULT_BADGE_DEFINITIONS;
}

export function saveBadgeDefinitions(badges: BadgeDefinition[]): void {
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  brandTitle: 'Code4Ever Platform',
  brandDomain: 'code4ever.ai.studio',
  brandDescription: 'Açık Kaynak Geliştirici Topluluğu & Kod Paylaşım Ağı',
  brandSlogan: 'Kodla, Paylaş, Büyü'
};

export function loadStoredPlatformSettings(): PlatformSettings {
  const data = localStorage.getItem(STORAGE_KEYS.PLATFORM);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_PLATFORM_SETTINGS;
    }
  }
  return DEFAULT_PLATFORM_SETTINGS;
}

export function savePlatformSettings(settings: PlatformSettings): void {
  localStorage.setItem(STORAGE_KEYS.PLATFORM, JSON.stringify(settings));
}

export function loadLanguage(): 'tr' | 'en' {
  const saved = localStorage.getItem(STORAGE_KEYS.LANG);
  return saved === 'en' ? 'en' : 'tr';
}

export function saveLanguage(lang: 'tr' | 'en'): void {
  localStorage.setItem(STORAGE_KEYS.LANG, lang);
}

export function saveGitHubToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.GH_TOKEN, token);
}

export function getGitHubToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.GH_TOKEN);
}
