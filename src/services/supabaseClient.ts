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
  PlatformSettings,
  ChatMessage,
  ChatGroup,
  GroupInvite,
  GroupMember
} from '../types';
import { sanitizeText, sanitizeUrl } from '../utils/securityHelper';

// Local Storage Cache Keys
export const STORAGE_KEYS = {
  PROFILE: 'c4e_supabase_user_profile',
  POSTS: 'c4e_supabase_posts',
  DELETED_POSTS: 'c4e_deleted_post_ids_v2',
  COMMUNITIES: 'c4e_supabase_communities',
  JOB_LISTINGS: 'c4e_supabase_job_listings',
  NOTIFICATIONS: 'c4e_supabase_notifications',
  MESSAGES: 'c4e_supabase_messages',
  GROUPS: 'c4e_supabase_groups',
  DELETED_GROUPS: 'c4e_deleted_group_ids_v2',
  GROUP_INVITES: 'c4e_supabase_group_invites',
  SUPABASE_CUSTOM_URL: 'c4e_custom_supabase_url',
  SUPABASE_CUSTOM_KEY: 'c4e_custom_supabase_anon_key',
  GH_TOKEN: 'c4e_gh_access_token',
  LANG: 'c4e_lang',
  CLOSED_BETA: 'c4e_closed_beta_settings',
  SUBSCRIPTIONS: 'c4e_subscription_plans',
  BADGES: 'c4e_badge_definitions',
  PLATFORM: 'c4e_platform_settings'
};

export function getActiveSupabaseCredentials(): { url: string; anonKey: string; isCustom: boolean } {
  let customUrl = '';
  let customKey = '';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      customUrl = localStorage.getItem(STORAGE_KEYS.SUPABASE_CUSTOM_URL) || '';
      customKey = localStorage.getItem(STORAGE_KEYS.SUPABASE_CUSTOM_KEY) || '';
    }
  } catch {}

  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const url = customUrl.trim() || envUrl;
  const anonKey = customKey.trim() || envKey;

  return {
    url,
    anonKey,
    isCustom: Boolean(customUrl.trim() && customKey.trim())
  };
}

export function isValidSupabaseConfig(url: string, key: string): boolean {
  if (!url || !key) return false;
  if (!url.startsWith('https://') && !url.startsWith('http://')) return false;
  if (key.length < 20) return false; // Valid anon key check prevents "No API key found in request" errors
  return true;
}

let supabaseInstance: SupabaseClient | null = null;
let lastInitUrl = '';
let lastInitKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getActiveSupabaseCredentials();

  if (!isValidSupabaseConfig(url, anonKey)) {
    return null;
  }

  if (supabaseInstance && lastInitUrl === url && lastInitKey === anonKey) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          apikey: anonKey,
          'X-Client-Info': 'code4ever-app'
        }
      }
    });
    lastInitUrl = url;
    lastInitKey = anonKey;
    return supabaseInstance;
  } catch (e) {
    console.warn('Supabase client initialization fallback to local storage:', e);
    return null;
  }
}

export function saveCustomSupabaseCredentials(url: string, anonKey: string): boolean {
  try {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    if (!cleanUrl && !cleanKey) {
      localStorage.removeItem(STORAGE_KEYS.SUPABASE_CUSTOM_URL);
      localStorage.removeItem(STORAGE_KEYS.SUPABASE_CUSTOM_KEY);
      supabaseInstance = null;
      lastInitUrl = '';
      lastInitKey = '';
      return true;
    }
    if (!isValidSupabaseConfig(cleanUrl, cleanKey)) {
      return false;
    }
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CUSTOM_URL, cleanUrl);
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CUSTOM_KEY, cleanKey);
    supabaseInstance = null;
    lastInitUrl = '';
    lastInitKey = '';
    getSupabaseClient();
    return true;
  } catch {
    return false;
  }
}

export const supabase = getSupabaseClient();

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

export const INITIAL_POSTS: Post[] = [];

export function loadDeletedPostIds(): Set<string> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DELETED_POSTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

export function saveDeletedPostId(postId: string): void {
  try {
    const set = loadDeletedPostIds();
    set.add(postId);
    localStorage.setItem(STORAGE_KEYS.DELETED_POSTS, JSON.stringify(Array.from(set)));
  } catch {}
}

export function loadStoredPosts(): Post[] {
  const data = localStorage.getItem(STORAGE_KEYS.POSTS);
  const deletedIds = loadDeletedPostIds();
  if (data) {
    try {
      const parsed: Post[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => p && p.id && !deletedIds.has(p.id) && !(p as any).is_deleted);
      }
    } catch {
      // Fallback
    }
  }
  return [];
}

export function saveStoredPosts(posts: Post[]): void {
  const deletedIds = loadDeletedPostIds();
  const clean = (posts || []).filter((p) => p && p.id && !deletedIds.has(p.id) && !(p as any).is_deleted);
  localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(clean));
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
      const deletedIds = loadDeletedPostIds();
      if (!error && data && data.length > 0) {
        const cleanData = (data as Post[]).filter(
          (p) => p && p.id && !deletedIds.has(p.id) && !(p as any).is_deleted
        );
        saveStoredPosts(cleanData);
        onUpdate(cleanData);
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
        const deletedIds = loadDeletedPostIds();
        const cleanData = (data as Post[]).filter(
          (p) => p && p.id && !deletedIds.has(p.id) && !(p as any).is_deleted
        );
        saveStoredPosts(cleanData);
        onUpdate(cleanData);
      }
    })
    .subscribe();

  // Listen to window post deletion event
  const handleLocalDeleted = (e: Event) => {
    const customEvent = e as CustomEvent<{ postId?: string }>;
    if (customEvent.detail?.postId) {
      onUpdate(loadStoredPosts());
    }
  };
  window.addEventListener('c4e_post_deleted', handleLocalDeleted);

  return () => {
    window.removeEventListener('c4e_post_deleted', handleLocalDeleted);
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

export async function deletePostInSupabase(postId: string): Promise<boolean> {
  // 1. Mark in permanent tombstone set so page refresh NEVER revives this post
  saveDeletedPostId(postId);

  // 2. Remove immediately from local storage cache
  const current = loadStoredPosts();
  const updated = current.filter((p) => p.id !== postId);
  saveStoredPosts(updated);

  // 3. Dispatch broadcast event for instantaneous UI sync across components/tabs
  try {
    window.dispatchEvent(new CustomEvent('c4e_post_deleted', { detail: { postId } }));
  } catch {}

  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from('posts').delete().eq('id', postId);
      if (error) {
        console.warn('Supabase post delete warning (will attempt soft-delete update):', error);
      }
      // Soft-delete backup to prevent any RLS policy from reviving
      try {
        await client.from('posts').update({ is_deleted: true, content: '[DELETED]' } as any).eq('id', postId);
      } catch {}
      return true;
    } catch (err) {
      console.warn('Supabase post delete network/table error:', err);
      return false;
    }
  }
  return true;
}

// -------------------------------------------------------------
// COMMUNITIES
// -------------------------------------------------------------

export const INITIAL_COMMUNITIES: Community[] = [];

export function loadStoredCommunities(): Community[] {
  const data = localStorage.getItem(STORAGE_KEYS.COMMUNITIES);
  if (data) {
    try {
      const parsed: Community[] = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback
    }
  }
  return [];
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

export const INITIAL_JOB_LISTINGS: JobListing[] = [];

export function loadStoredJobListings(): JobListing[] {
  const data = localStorage.getItem(STORAGE_KEYS.JOB_LISTINGS);
  if (data) {
    try {
      const parsed: JobListing[] = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback
    }
  }
  return [];
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
// NOTIFICATIONS PERSISTENCE
// -------------------------------------------------------------

export function loadStoredNotifications(): NotificationItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredNotifications(notifications: NotificationItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch {}
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

// -------------------------------------------------------------
// REAL-TIME PRESENCE (ONLINE / OFFLINE STATUS)
// -------------------------------------------------------------

export function subscribeToOnlinePresence(
  currentUser: UserProfile,
  onPresenceUpdate: (onlineUsernames: Set<string>) => void
): () => void {
  const client = getSupabaseClient();
  const cleanSelf = (currentUser?.username || '').toLowerCase().trim();

  if (!client || !cleanSelf) {
    onPresenceUpdate(new Set(cleanSelf ? [cleanSelf] : []));
    return () => {};
  }

  const channel = client.channel('online_presence_hub', {
    config: {
      presence: {
        key: cleanSelf
      }
    }
  });

  const syncState = () => {
    const state = channel.presenceState();
    const onlineSet = new Set<string>();
    Object.keys(state).forEach((key) => {
      if (key) onlineSet.add(key.toLowerCase().trim());
    });
    if (cleanSelf) onlineSet.add(cleanSelf);
    onPresenceUpdate(onlineSet);
  };

  channel
    .on('presence', { event: 'sync' }, syncState)
    .on('presence', { event: 'join' }, syncState)
    .on('presence', { event: 'leave' }, syncState)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({
            username: cleanSelf,
            display_name: currentUser.display_name,
            online_at: new Date().toISOString()
          });
        } catch (e) {
          console.warn('Presence track error:', e);
        }
      }
    });

  // Heartbeat to keep presence alive every 20 seconds
  const heartbeat = setInterval(async () => {
    try {
      await channel.track({
        username: cleanSelf,
        display_name: currentUser.display_name,
        online_at: new Date().toISOString()
      });
    } catch {}
  }, 20000);

  return () => {
    clearInterval(heartbeat);
    channel.untrack().catch(() => {});
    client.removeChannel(channel);
  };
}

// -------------------------------------------------------------
// REAL-TIME E2EE MESSAGES & GROUPS ENGINE
// -------------------------------------------------------------

export function loadStoredMessages(conversationId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredMessages(conversationId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`, JSON.stringify(messages));
  } catch {}
}

/**
 * Scans all conversation IDs and last messages for the given username.
 */
export function getActiveConversationsMap(currentUsername: string): Record<string, { lastMessage: ChatMessage; otherUsername: string }> {
  const cleanUser = (currentUsername || '').toLowerCase().trim();
  const map: Record<string, { lastMessage: ChatMessage; otherUsername: string }> = {};

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_KEYS.MESSAGES}_dm_`)) {
        const convId = key.replace(`${STORAGE_KEYS.MESSAGES}_`, '');
        if (convId.toLowerCase().includes(cleanUser)) {
          const parts = convId.replace('dm_', '').split('_');
          const other = parts.find((p) => p.toLowerCase() !== cleanUser) || parts[0];
          const messages = loadStoredMessages(convId);
          if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            map[convId] = {
              lastMessage: lastMsg,
              otherUsername: other
            };
          }
        }
      }
    }
  } catch {}

  return map;
}

export function subscribeToConversationMessages(
  conversationId: string,
  onUpdate: (messages: ChatMessage[]) => void
): () => void {
  const client = getSupabaseClient();
  const localMessages = loadStoredMessages(conversationId);
  onUpdate(localMessages);

  // Helper to cleanly merge and sort messages
  const mergeAndEmit = (incoming: ChatMessage[]) => {
    const current = loadStoredMessages(conversationId);
    const map = new Map<string, ChatMessage>();
    current.forEach((m) => map.set(m.id, m));
    incoming.forEach((m) => map.set(m.id, m));

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    saveStoredMessages(conversationId, merged);
    onUpdate(merged);
  };

  // Same-window broadcast event listener
  const handleCustomEvent = (e: any) => {
    if (e.detail && e.detail.conversation_id === conversationId) {
      mergeAndEmit([e.detail]);
    }
  };
  window.addEventListener('c4e_message_broadcast', handleCustomEvent);

  // Multi-tab storage event listener
  const handleStorage = (e: StorageEvent) => {
    if (e.key === `${STORAGE_KEYS.MESSAGES}_${conversationId}`) {
      onUpdate(loadStoredMessages(conversationId));
    }
  };
  window.addEventListener('storage', handleStorage);

  if (!client) {
    return () => {
      window.removeEventListener('c4e_message_broadcast', handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }

  // Fetch initial messages from Supabase
  client
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .then(
      ({ data, error }) => {
        if (!error && data && data.length > 0) {
          mergeAndEmit(data as ChatMessage[]);
        }
      },
      () => {}
    );

  // Realtime Broadcast Channel & Postgres Changes
  const channelTopic = `room_msg_${conversationId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const channel = client
    .channel(channelTopic)
    .on('broadcast', { event: 'new_msg' }, ({ payload }) => {
      if (payload && (payload as ChatMessage).conversation_id === conversationId) {
        mergeAndEmit([payload as ChatMessage]);
      }
    })
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        if (payload.new) {
          mergeAndEmit([payload.new as ChatMessage]);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        if (payload.new) {
          mergeAndEmit([payload.new as ChatMessage]);
        }
      }
    )
    .subscribe();

  return () => {
    window.removeEventListener('c4e_message_broadcast', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    client.removeChannel(channel);
  };
}

const userIncomingMessageSubscribers = new Map<string, Set<(msg: ChatMessage) => void>>();
const userIncomingMessageChannels = new Map<string, any>();

/**
 * Global incoming messages listener for active user.
 * Triggered whenever a new message is inserted in Supabase or broadcast that involves the current user,
 * firing audio, mobile vibrate, and desktop/PWA notifications.
 */
export function subscribeToUserIncomingMessages(
  currentUsername: string,
  onIncomingMessage: (msg: ChatMessage) => void
): () => void {
  const cleanUser = (currentUsername || '').toLowerCase().trim();
  if (!cleanUser) return () => {};

  if (!userIncomingMessageSubscribers.has(cleanUser)) {
    userIncomingMessageSubscribers.set(cleanUser, new Set());
  }
  const subscribers = userIncomingMessageSubscribers.get(cleanUser)!;
  subscribers.add(onIncomingMessage);

  const handleIncoming = (newMsg: ChatMessage) => {
    if (!newMsg || newMsg.sender_username?.toLowerCase() === cleanUser) {
      return; // Ignore own messages
    }

    const convId = (newMsg.conversation_id || '').toLowerCase();
    // Check if DM involves this user OR if user belongs to group
    const isUserDM = convId.startsWith('dm_') && convId.includes(cleanUser);
    const groups = loadStoredGroups();
    const isUserGroup = groups.some(
      (g) => g.id === newMsg.conversation_id && g.members?.some((m) => m.username?.toLowerCase() === cleanUser)
    );

    if (isUserDM || isUserGroup) {
      // Store in local storage for that conversation
      const current = loadStoredMessages(newMsg.conversation_id);
      if (!current.some((m) => m.id === newMsg.id)) {
        saveStoredMessages(newMsg.conversation_id, [...current, newMsg]);
      }
      const currentSubs = userIncomingMessageSubscribers.get(cleanUser);
      if (currentSubs) {
        currentSubs.forEach((cb) => {
          try {
            cb(newMsg);
          } catch (err) {
            console.error('Incoming message subscriber error:', err);
          }
        });
      }
    }
  };

  // Same-window broadcast listener
  const handleCustom = (e: any) => {
    if (e.detail) handleIncoming(e.detail);
  };
  window.addEventListener('c4e_message_broadcast', handleCustom);

  const client = getSupabaseClient();
  if (client && !userIncomingMessageChannels.has(cleanUser)) {
    const channelTopic = `global_feed_${cleanUser}_${Date.now()}`;
    const channel = client
      .channel(channelTopic)
      .on('broadcast', { event: 'incoming_msg' }, ({ payload }) => {
        if (payload) handleIncoming(payload as ChatMessage);
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (payload.new) handleIncoming(payload.new as ChatMessage);
        }
      )
      .subscribe();

    userIncomingMessageChannels.set(cleanUser, channel);
  }

  return () => {
    window.removeEventListener('c4e_message_broadcast', handleCustom);
    subscribers.delete(onIncomingMessage);
    if (subscribers.size === 0) {
      userIncomingMessageSubscribers.delete(cleanUser);
      const ch = userIncomingMessageChannels.get(cleanUser);
      if (ch && client) {
        client.removeChannel(ch);
      }
      userIncomingMessageChannels.delete(cleanUser);
    }
  };
}

export async function sendMessageService(message: ChatMessage): Promise<void> {
  const current = loadStoredMessages(message.conversation_id);
  const exists = current.some((m) => m.id === message.id);
  if (!exists) {
    const updated = [...current, message];
    saveStoredMessages(message.conversation_id, updated);
  }

  // Local window event for same-tab instant reactivity
  window.dispatchEvent(new CustomEvent('c4e_message_broadcast', { detail: message }));

  const client = getSupabaseClient();
  if (client) {
    // 1. Broadcast to specific room channel via ephemeral sender channel
    const roomChannel = client.channel(`send_room_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    roomChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        roomChannel.send({
          type: 'broadcast',
          event: 'new_msg',
          payload: message
        }).finally(() => {
          client.removeChannel(roomChannel);
        });
      }
    });

    // 2. Broadcast globally for background recipient notifications via ephemeral sender channel
    const globalChannel = client.channel(`send_global_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    globalChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        globalChannel.send({
          type: 'broadcast',
          event: 'incoming_msg',
          payload: message
        }).finally(() => {
          client.removeChannel(globalChannel);
        });
      }
    });

    // 3. Database persistence
    try {
      await client.from('messages').insert({
        id: message.id,
        conversation_id: message.conversation_id,
        is_group: Boolean(message.is_group),
        sender_id: message.sender_id,
        sender_username: message.sender_username,
        sender_display_name: message.sender_display_name,
        sender_avatar: message.sender_avatar,
        content: message.content,
        media_url: message.media_url || null,
        media_type: message.media_type || null,
        media_name: message.media_name || null,
        status: message.status || 'delivered',
        created_at: message.created_at,
        encryption_duration_ms: message.encryption_duration_ms || 0,
        reply_to: message.reply_to || null
      });
    } catch (err) {
      console.warn('Supabase message insert fallback:', err);
    }
  }
}

export async function markMessagesAsReadService(conversationId: string, readerUsername: string): Promise<void> {
  const current = loadStoredMessages(conversationId);
  let changed = false;
  const updated = current.map((m) => {
    if (m.sender_username !== readerUsername && m.status !== 'read') {
      changed = true;
      return { ...m, status: 'read' as const };
    }
    return m;
  });

  if (changed) {
    saveStoredMessages(conversationId, updated);
    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('messages')
          .update({ status: 'read' })
          .eq('conversation_id', conversationId)
          .neq('sender_username', readerUsername);
      } catch (err) {
        console.warn('Supabase mark read error:', err);
      }
    }
  }
}

// -------------------------------------------------------------
// GROUPS ENGINE
// -------------------------------------------------------------

export function loadDeletedGroupIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_GROUPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

export function saveDeletedGroupId(groupId: string): void {
  try {
    const set = loadDeletedGroupIds();
    set.add(groupId);
    localStorage.setItem(STORAGE_KEYS.DELETED_GROUPS, JSON.stringify(Array.from(set)));
  } catch {}
}

export function loadStoredGroups(): ChatGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GROUPS);
    const deletedIds = loadDeletedGroupIds();
    if (raw) {
      const parsed: ChatGroup[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((g) => g && g.id && !deletedIds.has(g.id));
      }
    }
  } catch {}
  return [];
}

export function saveStoredGroups(groups: ChatGroup[]): void {
  try {
    const deletedIds = loadDeletedGroupIds();
    const clean = (groups || []).filter((g) => g && g.id && !deletedIds.has(g.id));
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(clean));
  } catch {}
}

export function subscribeToGroupsService(
  username: string,
  onUpdate: (groups: ChatGroup[]) => void
): () => void {
  const client = getSupabaseClient();
  const local = loadStoredGroups();
  onUpdate(local);

  const handleGroupDeleted = (e: Event) => {
    const customEvent = e as CustomEvent<{ groupId?: string }>;
    if (customEvent.detail?.groupId) {
      onUpdate(loadStoredGroups());
    }
  };
  window.addEventListener('c4e_group_deleted', handleGroupDeleted);

  if (!client) {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.GROUPS || e.key === STORAGE_KEYS.DELETED_GROUPS) {
        onUpdate(loadStoredGroups());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('c4e_group_deleted', handleGroupDeleted);
    };
  }

  client
    .from('groups')
    .select('*')
    .then(
      ({ data, error }) => {
        const deletedIds = loadDeletedGroupIds();
        if (!error && data && data.length > 0) {
          const clean = (data as ChatGroup[]).filter((g) => g && g.id && !deletedIds.has(g.id));
          saveStoredGroups(clean);
          onUpdate(clean);
        }
      },
      () => {}
    );

  const channel = client
    .channel('public:groups')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, async () => {
      const { data } = await client.from('groups').select('*');
      if (data) {
        const deletedIds = loadDeletedGroupIds();
        const clean = (data as ChatGroup[]).filter((g) => g && g.id && !deletedIds.has(g.id));
        saveStoredGroups(clean);
        onUpdate(clean);
      }
    })
    .subscribe();

  return () => {
    window.removeEventListener('c4e_group_deleted', handleGroupDeleted);
    client.removeChannel(channel);
  };
}

export async function createGroupService(group: ChatGroup): Promise<void> {
  const current = loadStoredGroups();
  const updated = [group, ...current.filter((g) => g.id !== group.id)];
  saveStoredGroups(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('groups').upsert({
        id: group.id,
        name: sanitizeText(group.name, 60),
        avatar_url: group.avatar_url,
        description: group.description ? sanitizeText(group.description, 250) : null,
        creator_id: group.creator_id,
        creator_username: group.creator_username,
        admins: group.admins,
        members: group.members,
        last_message: group.last_message || null,
        created_at: group.created_at,
        updated_at: group.updated_at
      });
    } catch (err) {
      console.warn('Supabase create group error:', err);
    }
  }
}

export async function updateGroupService(groupId: string, updateData: Partial<ChatGroup>): Promise<void> {
  const current = loadStoredGroups();
  const updated = current.map((g) => (g.id === groupId ? { ...g, ...updateData, updated_at: new Date().toISOString() } : g));
  saveStoredGroups(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('groups')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', groupId);
    } catch (err) {
      console.warn('Supabase update group error:', err);
    }
  }
}

export async function deleteGroupService(groupId: string): Promise<void> {
  // 1. Tombstone tracking
  saveDeletedGroupId(groupId);

  // 2. Local cache cleanup
  const current = loadStoredGroups();
  const updated = current.filter((g) => g.id !== groupId);
  saveStoredGroups(updated);

  // 3. Remove cached messages
  try {
    localStorage.removeItem(`c4e_msgs_${groupId}`);
  } catch {}

  // 4. Dispatch event for instant UI update
  try {
    window.dispatchEvent(new CustomEvent('c4e_group_deleted', { detail: { groupId } }));
  } catch {}

  // 5. Database deletion
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('groups').delete().eq('id', groupId);
      await client.from('group_invites').delete().eq('group_id', groupId);
      await client.from('messages').delete().eq('conversation_id', groupId);
    } catch (err) {
      console.warn('Supabase delete group error:', err);
    }
  }
}

export async function leaveGroupService(groupId: string, username: string): Promise<void> {
  const current = loadStoredGroups();
  const group = current.find((g) => g.id === groupId);
  if (!group) return;

  const cleanUser = username.toLowerCase();
  const updatedMembers = group.members.filter((m) => m.username.toLowerCase() !== cleanUser);
  const updatedAdmins = group.admins.filter((a) => a.toLowerCase() !== cleanUser);

  if (updatedMembers.length === 0) {
    // If no members remain, delete the entire group
    await deleteGroupService(groupId);
    return;
  }

  // If the leaving user was the sole admin, elevate the oldest remaining member
  let finalAdmins = [...updatedAdmins];
  if (finalAdmins.length === 0 && updatedMembers.length > 0) {
    finalAdmins.push(updatedMembers[0].username);
    updatedMembers[0].role = 'admin';
  }

  await updateGroupService(groupId, {
    members: updatedMembers,
    admins: finalAdmins
  });
}

// -------------------------------------------------------------
// GROUP INVITES
// -------------------------------------------------------------

export function loadStoredGroupInvites(): GroupInvite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GROUP_INVITES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredGroupInvites(invites: GroupInvite[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GROUP_INVITES, JSON.stringify(invites));
  } catch {}
}

export function subscribeToGroupInvitesService(
  username: string,
  onUpdate: (invites: GroupInvite[]) => void
): () => void {
  const cleanUsername = username.toLowerCase();
  const client = getSupabaseClient();
  const local = loadStoredGroupInvites().filter((i) => i.target_username.toLowerCase() === cleanUsername);
  onUpdate(local);

  if (!client) {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.GROUP_INVITES) {
        onUpdate(loadStoredGroupInvites().filter((i) => i.target_username.toLowerCase() === cleanUsername));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }

  client
    .from('group_invites')
    .select('*')
    .eq('target_username', username)
    .eq('status', 'pending')
    .then(
      ({ data, error }) => {
        if (!error && data) {
          saveStoredGroupInvites(data as GroupInvite[]);
          onUpdate(data as GroupInvite[]);
        }
      },
      () => {}
    );

  const channel = client
    .channel(`invites:${username}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'group_invites',
        filter: `target_username=eq.${username}`
      },
      async () => {
        const { data } = await client
          .from('group_invites')
          .select('*')
          .eq('target_username', username)
          .eq('status', 'pending');
        if (data) {
          saveStoredGroupInvites(data as GroupInvite[]);
          onUpdate(data as GroupInvite[]);
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export async function sendGroupInviteService(invite: GroupInvite): Promise<boolean> {
  const current = loadStoredGroupInvites();
  const updated = [invite, ...current.filter((i) => i.id !== invite.id)];
  saveStoredGroupInvites(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('group_invites').upsert({
        id: invite.id,
        group_id: invite.group_id,
        group_name: invite.group_name,
        group_avatar: invite.group_avatar,
        group_description: invite.group_description || null,
        invited_by_username: invite.invited_by_username,
        invited_by_name: invite.invited_by_name,
        invited_by_avatar: invite.invited_by_avatar,
        target_username: invite.target_username,
        target_user_id: invite.target_user_id || null,
        status: invite.status || 'pending',
        created_at: invite.created_at
      });
      return true;
    } catch (err) {
      console.warn('Supabase send group invite error:', err);
      return true;
    }
  }
  return true;
}

export async function respondToGroupInviteService(
  inviteId: string,
  status: 'accepted' | 'declined',
  currentUser: UserProfile
): Promise<void> {
  const invites = loadStoredGroupInvites();
  const targetInvite = invites.find((i) => i.id === inviteId);
  const updatedInvites = invites.map((i) => (i.id === inviteId ? { ...i, status } : i));
  saveStoredGroupInvites(updatedInvites);

  if (status === 'accepted' && targetInvite) {
    // Add user to the group
    const groups = loadStoredGroups();
    const targetGroup = groups.find((g) => g.id === targetInvite.group_id);
    if (targetGroup) {
      const isAlreadyMember = targetGroup.members.some((m) => m.username.toLowerCase() === currentUser.username.toLowerCase());
      if (!isAlreadyMember) {
        const newMember: GroupMember = {
          id: currentUser.id || `mem_${Date.now()}`,
          username: currentUser.username,
          display_name: currentUser.display_name,
          avatar_url: currentUser.avatar_url,
          role: 'member',
          joined_at: new Date().toISOString()
        };
        const updatedMembers = [...targetGroup.members, newMember];
        await updateGroupService(targetGroup.id, { members: updatedMembers });
      }
    }
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('group_invites').update({ status }).eq('id', inviteId);
    } catch (err) {
      console.warn('Supabase respond invite error:', err);
    }
  }
}

export async function updateUserPresence(userId: string, isOnline: boolean): Promise<void> {
  const client = getSupabaseClient();
  if (client && userId) {
    try {
      await client.from('profiles').update({
        is_online: isOnline,
        last_seen_at: new Date().toISOString()
      }).eq('id', userId);
    } catch {}
  }
}

