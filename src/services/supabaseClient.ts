import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import {
  UserProfile,
  Post,
  CodeSnippet,
  PostComment,
  Community,
  JobListing,
  JobApplication,
  NotificationItem,
  ClosedBetaSettings,
  SubscriptionPlan,
  BadgeDefinition,
  BadgeItem,
  PlatformSettings,
  ChatMessage,
  GitHubRepo,
  ChatGroup,
  GroupInvite,
  GroupMember,
  SystemErrorReport,
  PostReport,
  PostCategory,
  INITIAL_CATEGORIES
} from '../types';
import { sanitizeText, sanitizeUrl } from '../utils/securityHelper';
import { encryptE2EEMessage } from '../utils/e2eeHelper';
import { sendJobApplicationWebhook } from './webhookService';

// Local Storage Cache Keys
export const STORAGE_KEYS = {
  PROFILE: 'c4e_supabase_user_profile',
  POSTS: 'c4e_supabase_posts',
  DELETED_POSTS: 'c4e_deleted_post_ids_v2',
  COMMUNITIES: 'c4e_supabase_communities',
  JOB_LISTINGS: 'c4e_supabase_job_listings',
  DELETED_JOBS: 'c4e_deleted_job_ids_v2',
  ALERTED_NOTIFICATIONS: 'c4e_alerted_notification_ids',
  ALERTED_JOB_APPLICATIONS: 'c4e_alerted_job_applications',
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
  PLATFORM: 'c4e_platform_settings',
  SYSTEM_ERROR_REPORTS: 'c4e_system_error_reports',
  POST_REPORTS: 'c4e_post_reports',
  CUSTOM_CATEGORIES: 'c4e_custom_categories'
};

export function loadDeletedJobIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_JOBS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDeletedJobId(jobId: string): void {
  if (!jobId) return;
  try {
    const current = loadDeletedJobIds();
    if (!current.includes(jobId)) {
      current.push(jobId);
      localStorage.setItem(STORAGE_KEYS.DELETED_JOBS, JSON.stringify(current));
    }
  } catch {}
}

export function isJobListingDeleted(jobId?: string): boolean {
  if (!jobId) return false;
  const deleted = loadDeletedJobIds();
  return deleted.includes(jobId);
}

export function hasNotificationBeenAlerted(notifId: string): boolean {
  if (!notifId) return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERTED_NOTIFICATIONS);
    const set: string[] = raw ? JSON.parse(raw) : [];
    return set.includes(notifId);
  } catch {
    return false;
  }
}

export function markNotificationAsAlerted(notifId: string): void {
  if (!notifId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERTED_NOTIFICATIONS);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (!set.includes(notifId)) {
      set.push(notifId);
      if (set.length > 500) set.splice(0, set.length - 500);
      localStorage.setItem(STORAGE_KEYS.ALERTED_NOTIFICATIONS, JSON.stringify(set));
    }
  } catch {}
}

export function hasJobApplicationBeenAlerted(jobId: string, applicantUsername: string): boolean {
  if (!jobId || !applicantUsername) return false;
  const key = `${jobId}_${applicantUsername.toLowerCase().trim()}`;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERTED_JOB_APPLICATIONS);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(key);
  } catch {
    return false;
  }
}

export function markJobApplicationAsAlerted(jobId: string, applicantUsername: string): void {
  if (!jobId || !applicantUsername) return;
  const key = `${jobId}_${applicantUsername.toLowerCase().trim()}`;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERTED_JOB_APPLICATIONS);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(key)) {
      list.push(key);
      if (list.length > 500) list.splice(0, list.length - 500);
      localStorage.setItem(STORAGE_KEYS.ALERTED_JOB_APPLICATIONS, JSON.stringify(list));
    }
  } catch {}
}

export function getActiveSupabaseCredentials(): {
  url: string;
  anonKey: string;
  isCustom: boolean;
  envMismatch?: boolean;
  warning?: string;
} {
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

  const isCustom = Boolean(customUrl.trim() && customKey.trim());
  const url = customUrl.trim() || envUrl;
  const anonKey = customKey.trim() || envKey;

  const envMismatch = Boolean(isCustom && envUrl && customUrl.trim().replace(/\/+$/, '') !== envUrl.replace(/\/+$/, ''));
  const warning = envMismatch
    ? `Dikkat: Tarayıcı yerel hafızasındaki Supabase URL (${customUrl}) ile proje ortam değişkeni (.env: ${envUrl}) farklı projelere işaret ediyor!`
    : undefined;

  return {
    url,
    anonKey,
    isCustom,
    envMismatch,
    warning
  };
}

export const getSupabaseConfig = getActiveSupabaseCredentials;

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
        const remoteWebsite = data.website || data.custom_fields?.website || defaultProfile.website;
        const remotePinned = (Array.isArray(data.pinned_repos) && data.pinned_repos.length > 0)
          ? data.pinned_repos
          : (Array.isArray(data.custom_fields?.pinned_repos) && data.custom_fields.pinned_repos.length > 0)
          ? data.custom_fields.pinned_repos
          : defaultProfile.pinned_repos || [];

        return {
          ...defaultProfile,
          ...data,
          website: remoteWebsite,
          pinned_repos: remotePinned,
          custom_fields: {
            ...(defaultProfile.custom_fields || {}),
            ...(data.custom_fields || {}),
            website: remoteWebsite || '',
            pinned_repos: remotePinned
          },
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
          custom_fields: defaultProfile.custom_fields || {},
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

export function normalizePostCodeSnippet(snippet: any, codeLanguage?: string): CodeSnippet | undefined {
  if (!snippet) return undefined;

  if (typeof snippet === 'object') {
    const code = typeof snippet.code === 'string' ? snippet.code : '';
    if (!code && !snippet.title) return undefined;
    return {
      title: snippet.title || 'Snippet',
      language: snippet.language || codeLanguage || 'Code',
      code: code
    };
  }

  if (typeof snippet === 'string') {
    const trimmed = snippet.trim();
    if (!trimmed) return undefined;

    // Try parsing stringified JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          const code = typeof parsed.code === 'string' ? parsed.code : (typeof parsed === 'string' ? parsed : '');
          if (code || parsed.title) {
            return {
              title: parsed.title || 'Snippet',
              language: parsed.language || codeLanguage || 'Code',
              code: code
            };
          }
        }
      } catch {}
    }

    return {
      title: 'Snippet',
      language: codeLanguage || 'Code',
      code: trimmed
    };
  }

  return undefined;
}

export function normalizePost(post: any): Post {
  if (!post || typeof post !== 'object') return post;
  const snippet = normalizePostCodeSnippet(post.code_snippet, (post as any).code_language);
  return {
    ...post,
    code_snippet: snippet,
    category: post.category || 'general',
    category_name: post.category_name || 'Genel & Sohbet'
  };
}

export function loadStoredPosts(): Post[] {
  const data = localStorage.getItem(STORAGE_KEYS.POSTS);
  const deletedIds = loadDeletedPostIds();
  if (data) {
    try {
      const parsed: Post[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((p) => p && p.id && !(p as any).is_deleted && !deletedIds.has(p.id))
          .map((p) => normalizePost(p));
      }
    } catch {
      // Fallback
    }
  }
  return [];
}

export function saveStoredPosts(posts: Post[]): void {
  const deletedIds = loadDeletedPostIds();
  const clean = (posts || [])
    .filter((p) => p && p.id && !(p as any).is_deleted && !deletedIds.has(p.id))
    .map((p) => normalizePost(p));
  localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(clean));
}

export async function syncDeletedPostsFromServer(): Promise<Set<string>> {
  const localSet = loadDeletedPostIds();
  try {
    const res = await fetch('/api/posts/deleted');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.deleted_ids)) {
        data.deleted_ids.forEach((id: string) => {
          if (id) {
            localSet.add(id);
            saveDeletedPostId(id);
          }
        });
      }
    }
  } catch {}
  return localSet;
}

export function subscribeToPosts(onUpdate: (posts: Post[]) => void): () => void {
  const client = getSupabaseClient();

  const refreshAndFilter = async (remotePosts: Post[]) => {
    const deletedIds = await syncDeletedPostsFromServer();
    const localPosts = loadStoredPosts();

    // Map by post ID to deduplicate and preserve non-persisted recent local posts
    const postsMap = new Map<string, Post>();

    // 1. Load remote posts
    (remotePosts || []).forEach((p) => {
      if (p && p.id && !(p as any).is_deleted && (p as any).content !== '[DELETED]' && !deletedIds.has(p.id)) {
        postsMap.set(p.id, normalizePost(p));
      }
    });

    // 2. Preserve any very recently created local posts (< 5 minutes old) not yet indexed in remote
    const now = Date.now();
    localPosts.forEach((lp) => {
      if (lp && lp.id && !postsMap.has(lp.id) && !deletedIds.has(lp.id) && !(lp as any).is_deleted) {
        const postTime = new Date(lp.created_at || '').getTime();
        if (!isNaN(postTime) && now - postTime < 5 * 60 * 1000) {
          postsMap.set(lp.id, normalizePost(lp));
        }
      }
    });

    const clean = Array.from(postsMap.values()).sort(
      (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );

    saveStoredPosts(clean);
    onUpdate(clean);
  };

  const fetchRemote = async () => {
    if (client) {
      try {
        const { data, error } = await client
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          refreshAndFilter(data as Post[]);
        }
      } catch {}
    }
  };

  // 1. Initial Load from Local Cache
  const initialLocal = loadStoredPosts();
  onUpdate(initialLocal);

  // 2. Fetch latest from Server / Supabase
  syncDeletedPostsFromServer().then(() => {
    fetchRemote();
  });

  // 3. Same-window broadcast event listener
  const handleLocalBroadcast = (e: any) => {
    if (e.detail?.post) {
      const incomingPost = e.detail.post as Post;
      const current = loadStoredPosts();
      const updated = [incomingPost, ...current.filter((p) => p.id !== incomingPost.id)];
      saveStoredPosts(updated);
      onUpdate(updated);
    }
  };
  window.addEventListener('c4e_post_broadcast', handleLocalBroadcast);

  // 4. Multi-tab storage event listener
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.POSTS) {
      onUpdate(loadStoredPosts());
    }
  };
  window.addEventListener('storage', handleStorage);

  if (!client) {
    return () => {
      window.removeEventListener('c4e_post_broadcast', handleLocalBroadcast);
      window.removeEventListener('storage', handleStorage);
    };
  }

  // 5. Realtime subscription via Supabase Channels (Postgres changes + Broadcast)
  const channel = client
    .channel('public:posts')
    .on('broadcast', { event: 'new_post' }, ({ payload }) => {
      if (payload && (payload as Post).id) {
        const incoming = payload as Post;
        const current = loadStoredPosts();
        const updated = [incoming, ...current.filter((p) => p.id !== incoming.id)];
        saveStoredPosts(updated);
        onUpdate(updated);
      }
    })
    .on('broadcast', { event: 'delete_post' }, ({ payload }) => {
      if (payload?.id) {
        saveDeletedPostId(payload.id);
        const current = loadStoredPosts().filter((p) => p.id !== payload.id);
        saveStoredPosts(current);
        onUpdate(current);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async (payload: any) => {
      try {
        if (payload?.eventType === 'DELETE') {
          const deletedId = payload.old?.id;
          if (deletedId) {
            saveDeletedPostId(deletedId);
            const current = loadStoredPosts().filter((p) => p.id !== deletedId);
            saveStoredPosts(current);
            onUpdate(current);
            return;
          }
        }

        if (payload?.eventType === 'UPDATE' && (payload.new?.is_deleted || payload.new?.content === '[DELETED]')) {
          const deletedId = payload.new?.id;
          if (deletedId) {
            saveDeletedPostId(deletedId);
            const current = loadStoredPosts().filter((p) => p.id !== deletedId);
            saveStoredPosts(current);
            onUpdate(current);
            return;
          }
        }

        fetchRemote();
      } catch (e) {
        console.warn('Realtime post refresh error:', e);
      }
    })
    .subscribe();

  // 6. Active background poller to ensure continuous real-time sync across different users
  const pollInterval = setInterval(() => {
    fetchRemote();
  }, 4000);

  // Listen to window post deletion event
  const handleLocalDeleted = (e: Event) => {
    const customEvent = e as CustomEvent<{ postId?: string }>;
    if (customEvent.detail?.postId) {
      onUpdate(loadStoredPosts());
    }
  };
  window.addEventListener('c4e_post_deleted', handleLocalDeleted);

  return () => {
    clearInterval(pollInterval);
    window.removeEventListener('c4e_post_broadcast', handleLocalBroadcast);
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('c4e_post_deleted', handleLocalDeleted);
    client.removeChannel(channel);
  };
}

export const ALLOWED_POST_COLUMNS = new Set([
  'id',
  'author',
  'content',
  'category',
  'category_name',
  'code_snippet',
  'code_language',
  'media_url',
  'media_type',
  'project_card',
  'community_id',
  'community_name',
  'community_handle',
  'likes_count',
  'liked_by',
  'comments_count',
  'comments',
  'reposts_count',
  'reposted_by',
  'bookmarked_by',
  'is_pinned',
  'is_deleted',
  'created_at'
]);

/**
 * Executes a Supabase table mutation with automatic adaptive schema retry.
 * If PostgREST fails with error 'Could not find the '<column>' column of '<table>' in the schema cache',
 * it automatically identifies the un-migrated column, strips it from the payload, and retries the mutation.
 */
export async function resilientSupabaseUpsert(
  table: string,
  payload: Record<string, any>,
  maxRetries = 4
): Promise<{ success: boolean; data?: any; error?: string }> {
  const client = getSupabaseClient();
  const config = getSupabaseConfig();
  const currentPayload = { ...payload };

  if (client) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await client.from(table).upsert(currentPayload);
        if (!error) {
          return { success: true, data };
        }

        const errMsg = error.message || '';
        // Check for PGRST204 missing column in schema cache error
        const missingColMatch = errMsg.match(/Could not find the '([^']+)' column/i);
        if (missingColMatch && missingColMatch[1] && currentPayload.hasOwnProperty(missingColMatch[1])) {
          const missingCol = missingColMatch[1];
          console.warn(`[Supabase Auto-Recovery] Table '${table}' schema cache missing column '${missingCol}'. Stripping and retrying.`);
          delete currentPayload[missingCol];
          continue;
        }

        // Other database error
        return { success: false, error: errMsg };
      } catch (err: any) {
        return { success: false, error: err?.message || String(err) };
      }
    }
  }

  // REST Fallback with sanitized payload
  if (config.url && config.anonKey) {
    try {
      const cleanUrl = config.url.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(currentPayload)
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errText = await response.text().catch(() => '');
        // If REST also fails on missing column, retry once stripped
        const missingColMatch = errText.match(/Could not find the '([^']+)' column/i);
        if (missingColMatch && missingColMatch[1] && currentPayload.hasOwnProperty(missingColMatch[1])) {
          delete currentPayload[missingColMatch[1]];
          const retryRes = await fetch(`${cleanUrl}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: config.anonKey,
              Authorization: `Bearer ${config.anonKey}`,
              Prefer: 'resolution=merge-duplicates'
            },
            body: JSON.stringify(currentPayload)
          });
          if (retryRes.ok) return { success: true };
        }
      }
    } catch {}
  }

  return { success: false, error: 'Supabase client and REST fallback failed' };
}

export async function resilientSupabaseUpdate(
  table: string,
  matchColumn: string,
  matchValue: any,
  updateData: Record<string, any>,
  maxRetries = 4
): Promise<{ success: boolean; data?: any; error?: string }> {
  const client = getSupabaseClient();
  const config = getSupabaseConfig();
  const currentUpdate = { ...updateData };

  if (client) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await client.from(table).update(currentUpdate).eq(matchColumn, matchValue);
        if (!error) {
          return { success: true, data };
        }

        const errMsg = error.message || '';
        const missingColMatch = errMsg.match(/Could not find the '([^']+)' column/i);
        if (missingColMatch && missingColMatch[1] && currentUpdate.hasOwnProperty(missingColMatch[1])) {
          const missingCol = missingColMatch[1];
          console.warn(`[Supabase Auto-Recovery] Table '${table}' schema cache missing column '${missingCol}'. Stripping from update.`);
          delete currentUpdate[missingCol];
          if (Object.keys(currentUpdate).length === 0) return { success: true };
          continue;
        }

        return { success: false, error: errMsg };
      } catch (err: any) {
        return { success: false, error: err?.message || String(err) };
      }
    }
  }

  if (config.url && config.anonKey) {
    try {
      const cleanUrl = config.url.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/rest/v1/${table}?${matchColumn}=eq.${encodeURIComponent(matchValue)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(currentUpdate)
      });
      if (response.ok) {
        return { success: true };
      }
    } catch {}
  }

  return { success: false, error: 'Supabase update failed' };
}

export async function createPostInSupabase(post: Post): Promise<{ success: boolean; error?: string; post: Post }> {
  const normalizedPost = normalizePost(post);
  const current = loadStoredPosts();
  const updated = [normalizedPost, ...current.filter((p) => p.id !== normalizedPost.id)];
  saveStoredPosts(updated);

  // Dispatch instant event in the active window
  try {
    window.dispatchEvent(new CustomEvent('c4e_post_broadcast', { detail: { post: normalizedPost } }));
  } catch {}

  const client = getSupabaseClient();
  if (client) {
    try {
      client.channel('public:posts').send({
        type: 'broadcast',
        event: 'new_post',
        payload: normalizedPost
      });
    } catch {}
  }

  const snippetCode = normalizedPost.code_snippet?.code || null;
  const snippetLang = normalizedPost.code_snippet?.language || (normalizedPost as any).code_language || null;
  const snippetPayload = normalizedPost.code_snippet
    ? JSON.stringify({
        title: normalizedPost.code_snippet.title || 'Snippet',
        language: snippetLang || 'Code',
        code: snippetCode || ''
      })
    : null;

  const payload: Record<string, any> = {
    id: normalizedPost.id,
    author: normalizedPost.author,
    content: sanitizeText(normalizedPost.content, 5000),
    category: normalizedPost.category || 'general',
    category_name: normalizedPost.category_name || 'Genel & Sohbet',
    code_snippet: snippetPayload,
    code_language: snippetLang || null,
    media_url: normalizedPost.media_url || null,
    media_type: normalizedPost.media_type || null,
    project_card: normalizedPost.project_card || null,
    community_id: normalizedPost.community_id || null,
    community_name: normalizedPost.community_name || null,
    community_handle: normalizedPost.community_handle || null,
    likes_count: Number(normalizedPost.likes_count) || 0,
    liked_by: normalizedPost.liked_by || [],
    comments_count: Number(normalizedPost.comments_count) || 0,
    comments: normalizedPost.comments || [],
    reposts_count: Number(normalizedPost.reposts_count) || 0,
    reposted_by: normalizedPost.reposted_by || [],
    bookmarked_by: normalizedPost.bookmarked_by || [],
    is_pinned: Boolean((normalizedPost as any).is_pinned),
    is_deleted: false,
    created_at: normalizedPost.created_at || new Date().toISOString()
  };

  const result = await resilientSupabaseUpsert('posts', payload);
  if (!result.success && result.error) {
    console.warn('Supabase post creation notice:', result.error);
  }
  return { success: result.success, error: result.error, post: normalizedPost };
}

export async function updatePostInSupabase(postId: string, updateData: Partial<Post>): Promise<{ success: boolean; error?: string }> {
  const current = loadStoredPosts();
  const updated = current.map((p) => (p.id === postId ? normalizePost({ ...p, ...updateData }) : p));
  saveStoredPosts(updated);

  // Sanitize updateData - strip client-only properties like is_liked, is_reposted, is_bookmarked, time_ago
  const sanitizedUpdate: Record<string, any> = {};
  for (const [key, val] of Object.entries(updateData)) {
    if (ALLOWED_POST_COLUMNS.has(key)) {
      if (key === 'code_snippet') {
        const normSnippet = normalizePostCodeSnippet(val, (updateData as any)?.code_language);
        sanitizedUpdate.code_snippet = normSnippet ? JSON.stringify(normSnippet) : null;
        if (normSnippet?.language) {
          sanitizedUpdate.code_language = normSnippet.language;
        }
      } else {
        sanitizedUpdate[key] = val;
      }
    }
  }

  if (Object.keys(sanitizedUpdate).length === 0) return { success: true };

  return resilientSupabaseUpdate('posts', 'id', postId, sanitizedUpdate);
}

export async function deletePostInSupabase(postId: string, requestingUser?: UserProfile): Promise<boolean> {
  // 1. Immediately register in persistent deleted blacklist
  saveDeletedPostId(postId);

  const current = loadStoredPosts();
  const target = current.find((p) => p.id === postId);

  // Authorization Check
  if (target && requestingUser) {
    const isAuthor =
      (target.author?.username || '').toLowerCase() === (requestingUser.username || '').toLowerCase() ||
      ((target.author as any)?.id && requestingUser.id && (target.author as any).id === requestingUser.id);
    const isAdmin = requestingUser.isAdmin === true || (requestingUser as any).role === 'admin' || (requestingUser.username || '').toLowerCase() === 'nylithra';
    if (!isAuthor && !isAdmin) {
      console.warn('Post deletion blocked: Not author and not admin');
      return false;
    }
  }

  // 2. Remove immediately from local storage cache
  const updated = current.filter((p) => p.id !== postId);
  saveStoredPosts(updated);

  // 3. Dispatch broadcast event for instantaneous UI sync across components/tabs
  try {
    window.dispatchEvent(new CustomEvent('c4e_post_deleted', { detail: { postId } }));
  } catch {}

  const config = getSupabaseConfig();
  const client = getSupabaseClient();

  // 4. Server-Side Synchronized Delete Relay (Broadcasts to all devices & deletes in backend)
  try {
    fetch('/api/posts/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId,
        customSupabaseUrl: config.url,
        customSupabaseAnonKey: config.anonKey
      })
    }).catch(() => {});
  } catch {}

  // 5. Direct Supabase Client Delete
  if (client) {
    try {
      const { error } = await client.from('posts').delete().eq('id', postId);
      if (error) {
        // Fallback soft-delete in case DELETE policy or constraint fails
        await client.from('posts').update({ is_deleted: true, content: '[DELETED]' } as any).eq('id', postId);
      }
    } catch (err) {
      console.warn('Supabase post delete network error:', err);
    }
  }

  // 6. Direct REST DELETE & PATCH fallback to Supabase HTTP API
  if (config.url && config.anonKey) {
    try {
      const cleanUrl = config.url.replace(/\/+$/, '');
      fetch(`${cleanUrl}/rest/v1/posts?id=eq.${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'return=representation'
        }
      }).catch(() => {});

      fetch(`${cleanUrl}/rest/v1/posts?id=eq.${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`
        },
        body: JSON.stringify({ is_deleted: true, content: '[DELETED]' })
      }).catch(() => {});
    } catch {}
  }

  return true;
}

export interface SupabaseTableStatus {
  connected: boolean;
  url: string;
  hasAnonKey: boolean;
  tables: {
    posts: boolean | 'checking';
    profiles: boolean | 'checking';
    communities: boolean | 'checking';
    job_listings: boolean | 'checking';
    job_applications: boolean | 'checking';
    messages: boolean | 'checking';
    system_error_reports?: boolean | 'checking';
    post_reports?: boolean | 'checking';
  };
  error?: string;
}

export async function checkSupabaseTablesStatus(): Promise<SupabaseTableStatus> {
  const client = getSupabaseClient();
  const config = getSupabaseConfig();

  if (!client) {
    return {
      connected: false,
      url: config.url || '',
      hasAnonKey: Boolean(config.anonKey),
      tables: {
        posts: false,
        profiles: false,
        communities: false,
        job_listings: false,
        job_applications: false,
        messages: false,
        system_error_reports: false,
        post_reports: false
      },
      error: 'Supabase URL veya Anon Key tanımlanmamış.'
    };
  }

  const checkTable = async (table: string): Promise<boolean> => {
    try {
      const { error } = await client.from(table).select('*', { count: 'exact', head: true }).limit(1);
      return !error || error.code === 'PGRST116';
    } catch {
      return false;
    }
  };

  try {
    const [posts, profiles, communities, job_listings, job_applications, messages, system_error_reports, post_reports] = await Promise.all([
      checkTable('posts'),
      checkTable('profiles'),
      checkTable('communities'),
      checkTable('job_listings'),
      checkTable('job_applications'),
      checkTable('messages'),
      checkTable('system_error_reports'),
      checkTable('post_reports')
    ]);

    const isConnected = posts || profiles || communities || job_listings || job_applications || messages || system_error_reports || post_reports;

    return {
      connected: isConnected,
      url: config.url,
      hasAnonKey: Boolean(config.anonKey),
      tables: {
        posts,
        profiles,
        communities,
        job_listings,
        job_applications,
        messages,
        system_error_reports,
        post_reports
      }
    };
  } catch (err: any) {
    return {
      connected: false,
      url: config.url,
      hasAnonKey: Boolean(config.anonKey),
      tables: {
        posts: false,
        profiles: false,
        communities: false,
        job_listings: false,
        job_applications: false,
        messages: false,
        system_error_reports: false,
        post_reports: false
      },
      error: err?.message || 'Bağlantı testi başarısız oldu.'
    };
  }
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
      if (!error && Array.isArray(data)) {
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

export const ALLOWED_COMMUNITY_COLUMNS = new Set([
  'id',
  'name',
  'handle',
  'avatar_url',
  'banner_url',
  'description',
  'members_count',
  'created_by',
  'creator_username',
  'api_key',
  'created_at',
  'updated_at'
]);

export async function createCommunityInSupabase(comm: Community): Promise<void> {
  const current = loadStoredCommunities();
  const updated = [comm, ...current.filter((c) => c.id !== comm.id)];
  saveStoredCommunities(updated);

  const payload: Record<string, any> = {};
  for (const [key, val] of Object.entries(comm)) {
    if (ALLOWED_COMMUNITY_COLUMNS.has(key)) {
      payload[key] = val;
    }
  }

  const client = getSupabaseClient();
  const config = getSupabaseConfig();

  if (client) {
    try {
      const { error } = await client.from('communities').upsert(payload);
      if (error) console.warn('Supabase community create error:', error.message || error);
    } catch (err) {
      console.warn('Supabase community create exception:', err);
    }
  }

  if (config.url && config.anonKey) {
    try {
      const cleanUrl = config.url.replace(/\/+$/, '');
      fetch(`${cleanUrl}/rest/v1/communities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch {}
  }
}

export async function updateCommunityInSupabase(commId: string, updateData: Partial<Community>): Promise<void> {
  const current = loadStoredCommunities();
  const updated = current.map((c) => (c.id === commId ? { ...c, ...updateData } : c));
  saveStoredCommunities(updated);

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString()
  };
  for (const [key, val] of Object.entries(updateData)) {
    if (ALLOWED_COMMUNITY_COLUMNS.has(key)) {
      if (key === 'members_count') {
        payload[key] = Math.max(0, parseInt(String(val), 10) || 0);
      } else {
        payload[key] = val;
      }
    }
  }

  const client = getSupabaseClient();
  const config = getSupabaseConfig();

  if (client) {
    try {
      const { error } = await client.from('communities').update(payload).eq('id', commId);
      if (error) console.warn('Supabase community update error:', error.message || error);
    } catch (err) {
      console.warn('Supabase community update exception:', err);
    }
  }

  if (config.url && config.anonKey) {
    try {
      const cleanUrl = config.url.replace(/\/+$/, '');
      fetch(`${cleanUrl}/rest/v1/communities?id=eq.${encodeURIComponent(commId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch {}
  }
}

export async function deleteCommunityFromSupabase(commId: string): Promise<void> {
  const current = loadStoredCommunities();
  const updated = current.filter((c) => c.id !== commId);
  saveStoredCommunities(updated);

  const client = getSupabaseClient();
  const config = getSupabaseConfig();

  if (client) {
    try {
      const { error } = await client.from('communities').delete().eq('id', commId);
      if (error) console.warn('Supabase community delete error:', error.message || error);
    } catch (err) {
      console.warn('Supabase community delete exception:', err);
    }
  }

  if (config.url && config.anonKey) {
    try {
      const cleanUrl = config.url.replace(/\/+$/, '');
      fetch(`${cleanUrl}/rest/v1/communities?id=eq.${encodeURIComponent(commId)}`, {
        method: 'DELETE',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'return=minimal'
        }
      }).catch(() => {});
    } catch {}
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
      if (Array.isArray(parsed)) return parsed.filter((j) => j && j.id);
    } catch {
      // Fallback
    }
  }
  return [];
}

export function saveStoredJobListings(listings: JobListing[]): void {
  const clean = (listings || []).filter((j) => j && j.id);
  localStorage.setItem(STORAGE_KEYS.JOB_LISTINGS, JSON.stringify(clean));
}

export async function fetchJobListingsFromSupabase(): Promise<JobListing[]> {
  const client = getSupabaseClient();
  const localListings = loadStoredJobListings();
  const listingsMap = new Map<string, JobListing>();
  const deletedJobs = loadDeletedJobIds();

  if (client) {
    try {
      const { data, error } = await client
        .from('job_listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item && item.id && !deletedJobs.includes(item.id)) {
            let parsedAuthor: any = {
              username: item.author_username || item.username || 'anonim',
              display_name: item.author_name || item.display_name || item.author_username || 'Geliştirici',
              avatar_url: item.author_avatar || item.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              role: item.author_role || item.role || 'Geliştirici'
            };

            if (typeof item.author === 'string') {
              try {
                const json = JSON.parse(item.author);
                if (json && typeof json === 'object') parsedAuthor = { ...parsedAuthor, ...json };
              } catch {}
            } else if (item.author && typeof item.author === 'object') {
              parsedAuthor = { ...parsedAuthor, ...item.author };
            }

            let parsedApps: any[] = [];
            if (Array.isArray(item.applications)) {
              parsedApps = item.applications;
            } else if (typeof item.applications === 'string') {
              try {
                const json = JSON.parse(item.applications);
                if (Array.isArray(json)) parsedApps = json;
              } catch {}
            }

            let parsedAppliedBy: string[] = [];
            if (Array.isArray(item.applied_by)) {
              parsedAppliedBy = item.applied_by;
            } else if (typeof item.applied_by === 'string') {
              try {
                const json = JSON.parse(item.applied_by);
                if (Array.isArray(json)) parsedAppliedBy = json;
              } catch {}
            }

            listingsMap.set(item.id, {
              id: item.id,
              type: item.type || 'job',
              title: item.title || 'İlan',
              description: item.description || '',
              quota: Number(item.quota) || 1,
              author: parsedAuthor,
              status: item.status || 'active',
              applications: parsedApps,
              applied_by: parsedAppliedBy,
              applications_count: parsedApps.length,
              created_at: item.created_at || new Date().toISOString(),
              time_ago: 'Az önce'
            });
          }
        });
      }

      // Also merge incoming records from job_applications table to guarantee all applicant submissions are present
      try {
        const { data: appsData } = await client
          .from('job_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (Array.isArray(appsData) && appsData.length > 0) {
          appsData.forEach((appItem: any) => {
            if (appItem && appItem.job_id && listingsMap.has(appItem.job_id)) {
              const target = listingsMap.get(appItem.job_id)!;
              const existingApps = target.applications || [];
              const alreadyExists = existingApps.some(
                (a) => a.id === appItem.id || (a.applicant_username === appItem.applicant_username && a.job_id === appItem.job_id)
              );
              if (!alreadyExists) {
                const formattedApp: JobApplication = {
                  id: appItem.id,
                  job_id: appItem.job_id,
                  job_title: target.title || appItem.job_title || 'İlan',
                  applicant_user_id: appItem.applicant_id || `usr_${appItem.applicant_username}`,
                  applicant_username: appItem.applicant_username,
                  applicant_display_name: appItem.name || appItem.applicant_username,
                  name: appItem.name,
                  age: Number(appItem.age) || 20,
                  experience: appItem.experience || '',
                  languages: appItem.languages || '',
                  description: appItem.description || '',
                  status: appItem.status || 'pending',
                  created_at: appItem.created_at || new Date().toISOString()
                };
                existingApps.push(formattedApp);
                target.applications = existingApps;
                target.applications_count = existingApps.length;
                if (!target.applied_by?.includes(appItem.applicant_username)) {
                  target.applied_by = [...(target.applied_by || []), appItem.applicant_username];
                }
              }
            }
          });
        }
      } catch (appErr) {
        console.warn('Fallback merging job_applications table:', appErr);
      }
    } catch (e) {
      console.warn('Error fetching job listings from Supabase:', e);
    }
  }

  // Preserve any very recent local listings (< 10 mins) not yet fetched
  const now = Date.now();
  localListings.forEach((lj) => {
    if (lj && lj.id && !listingsMap.has(lj.id) && !deletedJobs.includes(lj.id)) {
      const jobTime = new Date(lj.created_at || '').getTime();
      if (!isNaN(jobTime) && now - jobTime < 10 * 60 * 1000) {
        listingsMap.set(lj.id, lj);
      }
    }
  });

  const merged = Array.from(listingsMap.values()).sort(
    (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  );

  saveStoredJobListings(merged);
  return merged;
}

export function subscribeToJobListings(onUpdate: (listings: JobListing[]) => void): () => void {
  const client = getSupabaseClient();

  const refreshAndNotify = async () => {
    const list = await fetchJobListingsFromSupabase();
    onUpdate(list);
  };

  // 1. Initial local load
  onUpdate(loadStoredJobListings());

  // 2. Fetch from Supabase
  refreshAndNotify();

  // 3. Window event listener
  const handleLocalBroadcast = (e: any) => {
    if (e.detail?.listing) {
      const item = e.detail.listing as JobListing;
      const current = loadStoredJobListings();
      const updated = [item, ...current.filter((j) => j.id !== item.id)];
      saveStoredJobListings(updated);
      onUpdate(updated);
    } else if (e.detail?.deletedId) {
      const current = loadStoredJobListings().filter((j) => j.id !== e.detail.deletedId);
      saveStoredJobListings(current);
      onUpdate(current);
    }
  };
  window.addEventListener('c4e_job_broadcast', handleLocalBroadcast);

  // 4. Storage event listener (multi-tab)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.JOB_LISTINGS) {
      onUpdate(loadStoredJobListings());
    }
  };
  window.addEventListener('storage', handleStorage);

  if (!client) {
    return () => {
      window.removeEventListener('c4e_job_broadcast', handleLocalBroadcast);
      window.removeEventListener('storage', handleStorage);
    };
  }

  // 5. Supabase Realtime Channel
  const channel = client
    .channel('public:job_listings')
    .on('broadcast', { event: 'new_job' }, ({ payload }) => {
      if (payload?.id) {
        const item = payload as JobListing;
        const current = loadStoredJobListings();
        const updated = [item, ...current.filter((j) => j.id !== item.id)];
        saveStoredJobListings(updated);
        onUpdate(updated);
      }
    })
    .on('broadcast', { event: 'update_job' }, ({ payload }) => {
      if (payload?.id) {
        const item = payload as JobListing;
        const current = loadStoredJobListings();
        const updated = current.map((j) => (j.id === item.id ? item : j));
        saveStoredJobListings(updated);
        onUpdate(updated);
      }
    })
    .on('broadcast', { event: 'delete_job' }, ({ payload }) => {
      if (payload?.id) {
        const current = loadStoredJobListings().filter((j) => j.id !== payload.id);
        saveStoredJobListings(current);
        onUpdate(current);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'job_listings' }, async (payload: any) => {
      try {
        if (payload?.eventType === 'DELETE') {
          const deletedId = payload.old?.id;
          if (deletedId) {
            const current = loadStoredJobListings().filter((j) => j.id !== deletedId);
            saveStoredJobListings(current);
            onUpdate(current);
            return;
          }
        }
        refreshAndNotify();
      } catch (e) {
        console.warn('Realtime job refresh error:', e);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'job_applications' }, async () => {
      try {
        refreshAndNotify();
      } catch (e) {
        console.warn('Realtime job applications refresh error:', e);
      }
    })
    .subscribe();

  // 6. Active polling interval
  const pollInterval = setInterval(() => {
    refreshAndNotify();
  }, 4000);

  return () => {
    clearInterval(pollInterval);
    window.removeEventListener('c4e_job_broadcast', handleLocalBroadcast);
    window.removeEventListener('storage', handleStorage);
    client.removeChannel(channel);
  };
}

export async function createJobListing(listing: JobListing): Promise<void> {
  const current = loadStoredJobListings();
  const updated = [listing, ...current.filter((j) => j.id !== listing.id)];
  saveStoredJobListings(updated);

  try {
    window.dispatchEvent(new CustomEvent('c4e_job_broadcast', { detail: { listing } }));
  } catch {}

  const client = getSupabaseClient();
  if (client) {
    try {
      client.channel('public:job_listings').send({
        type: 'broadcast',
        event: 'new_job',
        payload: listing
      });
    } catch {}
  }

  const payload: Record<string, any> = {
    id: listing.id,
    type: listing.type,
    title: sanitizeText(listing.title),
    description: sanitizeText(listing.description),
    quota: listing.quota,
    author: listing.author,
    author_username: listing.author?.username,
    author_name: listing.author?.display_name,
    author_avatar: listing.author?.avatar_url,
    status: listing.status || 'active',
    created_at: listing.created_at || new Date().toISOString(),
    applications: listing.applications || [],
    applied_by: listing.applied_by || []
  };

  const result = await resilientSupabaseUpsert('job_listings', payload);
  if (!result.success && result.error) {
    console.warn('Supabase job listing sync error:', result.error);
  }
}

export async function deleteJobListing(jobId: string): Promise<void> {
  if (!jobId) return;

  // 1. Mark as permanently deleted in local blacklist
  saveDeletedJobId(jobId);

  // 2. Remove from local job listings cache
  const current = loadStoredJobListings();
  const updated = current.filter((j) => j.id !== jobId);
  saveStoredJobListings(updated);

  // 3. Purge all related job application notifications locally
  const currentNotifs = loadStoredNotifications();
  const filteredNotifs = currentNotifs.filter(
    (n) => !(n.type === 'job_application' && n.target_id === jobId)
  );
  saveStoredNotifications(filteredNotifs);

  try {
    window.dispatchEvent(new CustomEvent('c4e_job_broadcast', { detail: { deletedId: jobId } }));
    window.dispatchEvent(new CustomEvent('c4e_notification_update', { detail: { filteredNotifs } }));
  } catch {}

  const client = getSupabaseClient();
  const config = getSupabaseConfig();

  if (client) {
    try {
      client.channel('public:job_listings').send({
        type: 'broadcast',
        event: 'delete_job',
        payload: { id: jobId }
      });
      // Delete listing from job_listings
      await client.from('job_listings').delete().eq('id', jobId);
      // Delete all related applications from job_applications
      await client.from('job_applications').delete().eq('job_id', jobId);
      // Delete all related notifications from notifications table
      await client.from('notifications').delete().match({ type: 'job_application', target_id: jobId });
    } catch (err) {
      console.warn('Supabase job listing delete error:', err);
    }
  }

  if (config.url && config.anonKey) {
    try {
      const cleanUrl = config.url.replace(/\/+$/, '');
      fetch(`${cleanUrl}/rest/v1/job_listings?id=eq.${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'return=minimal'
        }
      }).catch(() => {});
      fetch(`${cleanUrl}/rest/v1/job_applications?job_id=eq.${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'return=minimal'
        }
      }).catch(() => {});
      fetch(`${cleanUrl}/rest/v1/notifications?type=eq.job_application&target_id=eq.${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'return=minimal'
        }
      }).catch(() => {});
    } catch {}
  }
}

export async function submitJobApplication(
  application: JobApplication,
  onNotifyAuthor?: (notification: NotificationItem) => void
): Promise<boolean> {
  const cleanApplicant = (application.applicant_username || '').toLowerCase().trim();
  const jobId = application.job_id;

  // 1. Guard against applying to deleted jobs
  if (!jobId || isJobListingDeleted(jobId)) {
    console.warn('Job listing has been deleted. Application aborted.');
    return false;
  }

  const currentListings = loadStoredJobListings();
  let targetJob = currentListings.find((j) => j.id === jobId);

  const client = getSupabaseClient();

  if (!targetJob && client) {
    try {
      const { data } = await client.from('job_listings').select('*').eq('id', jobId).maybeSingle();
      if (data) {
        targetJob = data as JobListing;
      }
    } catch {}
  }

  // If job listing is not found or has been removed, do not proceed with fake listing
  if (!targetJob) {
    console.warn('Target job listing not found or removed.');
    return false;
  }

  // 2. Prevent duplicate applications from the same user to the same listing
  const alreadyApplied =
    (targetJob.applied_by || []).some((u) => (u || '').toLowerCase() === cleanApplicant) ||
    (targetJob.applications || []).some((a) => (a.applicant_username || '').toLowerCase() === cleanApplicant);

  if (alreadyApplied) {
    console.info('Applicant has already submitted an application for this listing.');
    return true; // Gracefully acknowledge without re-firing notifications
  }

  // 3. Ensure this application alerts the author AT MOST ONCE
  if (hasJobApplicationBeenAlerted(jobId, cleanApplicant)) {
    console.info('Application notification already alerted once.');
    return true;
  }
  markJobApplicationAsAlerted(jobId, cleanApplicant);

  const cleanApp: JobApplication = {
    ...application,
    id: application.id || `app_${jobId}_${cleanApplicant}`,
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
  if (!currentListings.some((j) => j.id === targetJob.id)) {
    updatedListings.unshift(updatedJob);
  }
  saveStoredJobListings(updatedListings);

  try {
    window.dispatchEvent(new CustomEvent('c4e_job_broadcast', { detail: { listing: updatedJob } }));
  } catch {}

  // Deterministic Notification ID prevents duplicate rows and repeated alerts
  const notifId = `notif_job_app_${targetJob.id}_${cleanApplicant}`;
  markNotificationAsAlerted(notifId);

  const notification: NotificationItem = {
    id: notifId,
    type: 'job_application',
    recipient_id: targetJob.author.username,
    actor: {
      username: application.applicant_username,
      display_name: application.applicant_display_name || application.name || application.applicant_username,
      avatar_url: application.applicant_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    },
    content: `"${targetJob.title}" başlıklı ${targetJob.type === 'team' ? 'ekip' : 'iş'} ilanınıza başvurdu.`,
    time_ago: 'Az önce',
    is_read: false,
    target_id: targetJob.id,
    created_at: new Date().toISOString()
  };

  // Only call local author callback if current user IS the author (e.g. self-test)
  try {
    const localUser = loadStoredProfile();
    if (
      localUser &&
      targetJob.author.username &&
      localUser.username.toLowerCase() === targetJob.author.username.toLowerCase() &&
      onNotifyAuthor
    ) {
      onNotifyAuthor(notification);
    }
  } catch {}

  // Send real-time and database persistent notification to job author
  await sendNotificationService(notification);

  // Send an automatic DM to the job author once
  try {
    const authorUser = (targetJob.author?.username || '').toLowerCase();
    const applicantUser = cleanApplicant;
    if (authorUser && applicantUser && authorUser !== applicantUser) {
      const sorted = [applicantUser, authorUser].sort();
      const convId = `dm_${sorted.join('_')}`;
      const introText = `💼 Merhaba! "${targetJob.title}" başlıklı ${targetJob.type === 'team' ? 'ekip' : 'iş'} ilanınıza başvuru yaptım.\n\n👤 Başvuran: ${cleanApp.name}\n🎂 Yaş: ${cleanApp.age}\n💼 Deneyim: ${cleanApp.experience}\n🛠️ Diller/Teknolojiler: ${cleanApp.languages}\n📝 Açıklama: ${cleanApp.description}`;
      const { encrypted, durationMs } = await encryptE2EEMessage(introText, convId);
      const directMsg: ChatMessage = {
        id: `msg_app_${targetJob.id}_${applicantUser}`,
        conversation_id: convId,
        is_group: false,
        sender_id: application.applicant_user_id || `usr_${applicantUser}`,
        sender_username: application.applicant_username,
        sender_display_name: application.applicant_display_name || application.name || application.applicant_username,
        sender_avatar: application.applicant_avatar,
        content: encrypted,
        decrypted_text: introText,
        status: 'delivered',
        created_at: new Date().toISOString(),
        encryption_duration_ms: durationMs
      };
      await sendMessageService(directMsg);
    }
  } catch (dmErr) {
    console.warn('Auto job application DM error:', dmErr);
  }

  // Also push to local stored notifications if target author matches local user
  try {
    const localUser = loadStoredProfile();
    if (localUser && targetJob.author.username && localUser.username.toLowerCase() === targetJob.author.username.toLowerCase()) {
      const storedNotifs = loadStoredNotifications();
      if (!storedNotifs.some((n) => n.id === notification.id)) {
        saveStoredNotifications([notification, ...storedNotifs]);
      }
    }
  } catch {}

  // Dispatch Webhooks (Discord, Jubbio, Telegram) configured in settings
  try {
    sendJobApplicationWebhook(targetJob, cleanApp).catch((err) => {
      console.warn('Webhook dispatch error:', err);
    });
  } catch (err) {
    console.warn('Webhook execution error:', err);
  }

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

      // Direct update on job_listings row
      const { error: updateErr } = await client
        .from('job_listings')
        .update({
          applications: updatedApps,
          applied_by: appliedBy
        })
        .eq('id', targetJob.id);

      if (updateErr) {
        await resilientSupabaseUpsert('job_listings', {
          id: targetJob.id,
          applications: updatedApps,
          applied_by: appliedBy
        });
      }

      // Broadcast update to real-time channel
      const jobChan = client.channel('public:job_listings');
      jobChan.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          jobChan.send({
            type: 'broadcast',
            event: 'update_job',
            payload: updatedJob
          }).finally(() => client.removeChannel(jobChan));
        }
      });
    } catch (err) {
      console.warn('Supabase application sync error:', err);
    }
  }

  return true;
}

// -------------------------------------------------------------
// NOTIFICATIONS PERSISTENCE & REAL-TIME
// -------------------------------------------------------------

export function loadStoredNotifications(): NotificationItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Automatically purge any stale notifications for deleted job listings
        const filtered = parsed.filter(
          (n) => !(n && n.type === 'job_application' && isJobListingDeleted(n.target_id))
        );
        if (filtered.length !== parsed.length) {
          saveStoredNotifications(filtered);
        }
        return filtered;
      }
    }
  } catch {}
  return [];
}

export function saveStoredNotifications(notifications: NotificationItem[]): void {
  try {
    const clean = (notifications || []).filter(
      (n) => !(n && n.type === 'job_application' && isJobListingDeleted(n.target_id))
    );
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(clean));
  } catch {}
}

export async function fetchNotificationsFromSupabase(currentUsername: string): Promise<NotificationItem[]> {
  const cleanUser = (currentUsername || '').toLowerCase().trim();
  const local = loadStoredNotifications();
  const client = getSupabaseClient();
  if (!client || !cleanUser) return local;

  try {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .ilike('recipient_id', cleanUser)
      .order('created_at', { ascending: false })
      .limit(60);

    if (!error && Array.isArray(data)) {
      const map = new Map<string, NotificationItem>();
      local.forEach((n) => {
        if (!(n.type === 'job_application' && isJobListingDeleted(n.target_id))) {
          map.set(n.id, n);
        }
      });

      data.forEach((item: any) => {
        // Ignore notifications for deleted jobs
        if (item.type === 'job_application' && isJobListingDeleted(item.target_id)) {
          return;
        }

        let actor = item.actor;
        if (typeof actor === 'string') {
          try {
            actor = JSON.parse(actor);
          } catch {}
        }
        map.set(item.id, {
          id: item.id,
          recipient_id: item.recipient_id,
          type: item.type,
          actor: actor || { username: 'anonim', display_name: 'Biri' },
          content: item.content,
          is_read: Boolean(item.is_read),
          target_id: item.target_id,
          created_at: item.created_at || new Date().toISOString(),
          time_ago: 'Az önce'
        });
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      );
      saveStoredNotifications(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Supabase notifications fetch error:', err);
  }
  return local;
}

export async function sendNotificationService(notification: NotificationItem): Promise<void> {
  const recipient = (notification.recipient_id || '').toLowerCase().trim();
  if (!recipient) return;

  // Abort if notification belongs to a deleted job listing
  if (notification.type === 'job_application' && isJobListingDeleted(notification.target_id)) {
    return;
  }

  // 1. Same-window local event
  try {
    window.dispatchEvent(new CustomEvent('c4e_notification_broadcast', { detail: notification }));
  } catch {}

  const client = getSupabaseClient();
  if (client) {
    // 2. Realtime Broadcast to recipient
    const chanName = `c4e_send_notify_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const notifyChan = client.channel(chanName);
    notifyChan.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        notifyChan.send({
          type: 'broadcast',
          event: 'new_notification',
          payload: notification
        }).finally(() => {
          client.removeChannel(notifyChan);
        });
      }
    });

    // 3. Insert into Supabase notifications table (upsert avoids duplicate key errors)
    try {
      await client.from('notifications').upsert({
        id: notification.id,
        recipient_id: recipient,
        type: notification.type,
        actor: notification.actor,
        content: notification.content,
        is_read: Boolean(notification.is_read),
        target_id: notification.target_id || null,
        created_at: notification.created_at || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('Supabase notification insert error:', err);
    }
  }
}

export function subscribeToUserNotifications(
  currentUsername: string,
  onUpdate: (notifications: NotificationItem[]) => void,
  onNewNotification?: (notif: NotificationItem) => void
): () => void {
  const cleanUser = (currentUsername || '').toLowerCase().trim();
  if (!cleanUser) return () => {};

  // Initial load
  onUpdate(loadStoredNotifications());
  fetchNotificationsFromSupabase(cleanUser).then((list) => {
    onUpdate(list);
  });

  const handleNewNotif = (notif: NotificationItem) => {
    if (!notif || !notif.id) return;

    // Discard any notification for a deleted job listing
    if (notif.type === 'job_application' && isJobListingDeleted(notif.target_id)) {
      return;
    }

    const current = loadStoredNotifications();
    const alreadyStored = current.some((n) => n.id === notif.id);
    const alreadyAlerted = hasNotificationBeenAlerted(notif.id) ||
      (notif.type === 'job_application' && notif.target_id && notif.actor?.username
        ? hasJobApplicationBeenAlerted(notif.target_id, notif.actor.username)
        : false);

    if (!alreadyStored) {
      const updated = [notif, ...current];
      saveStoredNotifications(updated);
      onUpdate(updated);
    }

    // STRICT ONE-TIME ALERT: Only trigger sound and native notification once per lifecycle
    if (!alreadyAlerted) {
      markNotificationAsAlerted(notif.id);
      if (notif.type === 'job_application' && notif.target_id && notif.actor?.username) {
        markJobApplicationAsAlerted(notif.target_id, notif.actor.username);
      }
      if (onNewNotification) onNewNotification(notif);
    }
  };

  const handleCustomEvent = (e: any) => {
    if (e.detail) {
      handleNewNotif(e.detail);
    }
  };
  window.addEventListener('c4e_notification_broadcast', handleCustomEvent);

  const handleNotificationUpdate = (e: any) => {
    if (e.detail?.filteredNotifs) {
      onUpdate(e.detail.filteredNotifs);
    }
  };
  window.addEventListener('c4e_notification_update', handleNotificationUpdate);

  const client = getSupabaseClient();
  let channel: any = null;
  if (client) {
    channel = client
      .channel(`c4e_notify_${cleanUser}`)
      .on('broadcast', { event: 'new_notification' }, ({ payload }) => {
        if (payload) handleNewNotif(payload as NotificationItem);
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${cleanUser}`
        },
        (payload) => {
          if (payload.new) {
            let actor = payload.new.actor;
            if (typeof actor === 'string') {
              try { actor = JSON.parse(actor); } catch {}
            }
            handleNewNotif({
              id: payload.new.id,
              recipient_id: payload.new.recipient_id,
              type: payload.new.type,
              actor: actor || { username: 'biri', display_name: 'Biri' },
              content: payload.new.content,
              is_read: Boolean(payload.new.is_read),
              target_id: payload.new.target_id,
              created_at: payload.new.created_at || new Date().toISOString(),
              time_ago: 'Az önce'
            });
          }
        }
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener('c4e_notification_broadcast', handleCustomEvent);
    window.removeEventListener('c4e_notification_update', handleNotificationUpdate);
    if (channel && client) {
      client.removeChannel(channel);
    }
  };
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
  try {
    const raw = localStorage.getItem('c4e_all_users_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeProfile);
      }
    }
  } catch {}
  const local = loadStoredProfile();
  return local ? [normalizeProfile(local)] : [];
}

export function saveStoredAllUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem('c4e_all_users_cache', JSON.stringify(users));
  } catch {}
}

export function normalizeProfile(raw: any): UserProfile {
  if (!raw) return raw;
  const cf = raw.custom_fields || {};
  const website = raw.website || cf.website || undefined;
  const pinnedRepos = Array.isArray(raw.pinned_repos) && raw.pinned_repos.length > 0
    ? raw.pinned_repos
    : Array.isArray(cf.pinned_repos) && cf.pinned_repos.length > 0
    ? cf.pinned_repos
    : [];

  let badges: BadgeItem[] = [];
  if (Array.isArray(raw.badges) && raw.badges.length > 0) {
    badges = raw.badges;
  } else if (Array.isArray(cf.badges) && cf.badges.length > 0) {
    badges = cf.badges;
  } else if (typeof cf.badges === 'string') {
    try {
      const parsed = JSON.parse(cf.badges);
      if (Array.isArray(parsed)) badges = parsed;
    } catch {}
  } else if (typeof raw.badges === 'string') {
    try {
      const parsed = JSON.parse(raw.badges);
      if (Array.isArray(parsed)) badges = parsed;
    } catch {}
  }

  const betaStatus = raw.betaStatus || cf.betaStatus;
  const betaContact = raw.betaContact || cf.betaContact;
  const isBanned = raw.isBanned !== undefined ? raw.isBanned : cf.isBanned;
  const banReason = raw.banReason || cf.banReason;
  const suspendedUntil = raw.suspendedUntil || cf.suspendedUntil;
  const subscription = raw.subscription || cf.subscription;

  return {
    ...raw,
    website,
    pinned_repos: pinnedRepos,
    badges,
    betaStatus,
    betaContact,
    isBanned,
    banReason,
    suspendedUntil,
    subscription,
    custom_fields: {
      ...cf,
      website: website || '',
      pinned_repos: pinnedRepos,
      badges,
      betaStatus,
      betaContact,
      subscription
    }
  };
}

export function subscribeToAllUsers(onUpdate: (users: UserProfile[]) => void): () => void {
  const client = getSupabaseClient();
  if (!client) {
    const local = loadStoredAllUsers();
    onUpdate(local);
    return () => {};
  }

  client.from('profiles').select('*').then(({ data }) => {
    if (data) {
      const normalized = data.map(normalizeProfile);
      saveStoredAllUsers(normalized);
      onUpdate(normalized);
    }
  });

  const channel = client
    .channel('public:profiles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
      const { data } = await client.from('profiles').select('*');
      if (data) {
        const normalized = data.map(normalizeProfile);
        saveStoredAllUsers(normalized);
        onUpdate(normalized);
      }
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export const ALLOWED_PROFILE_COLUMNS = new Set([
  'id',
  'username',
  'display_name',
  'avatar_url',
  'banner_url',
  'bio',
  'role',
  'verified',
  'email',
  'website',
  'pinned_repos',
  'theme_color',
  'accent_color',
  'joined_communities',
  'custom_fields',
  'is_admin',
  'saved_post_ids',
  'allow_group_invites',
  'show_liked_posts',
  'is_online',
  'last_seen_at',
  'integrations',
  'created_at',
  'updated_at'
]);

export async function updateUserProfileInSupabase(userId: string, updateData: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
  const local = loadStoredProfile();

  // Merge custom_fields so that website & pinned_repos are always stored inside custom_fields JSONB as fallback
  const existingCustomFields = local?.custom_fields || {};
  const updateCustomFields = updateData.custom_fields || {};
  const mergedCustomFields: Record<string, any> = {
    ...existingCustomFields,
    ...updateCustomFields
  };

  const finalWebsite = updateData.website !== undefined 
    ? updateData.website 
    : (updateCustomFields.website !== undefined ? updateCustomFields.website : existingCustomFields.website);

  const rawFinalPinned = updateData.pinned_repos !== undefined
    ? updateData.pinned_repos
    : (updateCustomFields.pinned_repos !== undefined ? updateCustomFields.pinned_repos : (existingCustomFields.pinned_repos || local?.pinned_repos || []));

  let finalPinnedRepos: GitHubRepo[] = [];
  if (Array.isArray(rawFinalPinned)) {
    finalPinnedRepos = rawFinalPinned;
  } else if (typeof rawFinalPinned === 'string') {
    try {
      const parsed = JSON.parse(rawFinalPinned);
      finalPinnedRepos = Array.isArray(parsed) ? parsed : [];
    } catch {
      finalPinnedRepos = [];
    }
  }

  if (finalWebsite !== undefined) {
    mergedCustomFields.website = finalWebsite;
  }
  mergedCustomFields.pinned_repos = finalPinnedRepos;

  if (updateData.badges !== undefined) {
    mergedCustomFields.badges = updateData.badges;
  }
  if (updateData.betaStatus !== undefined) {
    mergedCustomFields.betaStatus = updateData.betaStatus;
  }
  if (updateData.betaContact !== undefined) {
    mergedCustomFields.betaContact = updateData.betaContact;
  }
  if (updateData.subscription !== undefined) {
    mergedCustomFields.subscription = updateData.subscription;
  }
  if (updateData.isBanned !== undefined) {
    mergedCustomFields.isBanned = updateData.isBanned;
  }
  if (updateData.banReason !== undefined) {
    mergedCustomFields.banReason = updateData.banReason;
  }
  if (updateData.suspendedUntil !== undefined) {
    mergedCustomFields.suspendedUntil = updateData.suspendedUntil;
  }

  const updatedUser: UserProfile = {
    ...(local || {} as UserProfile),
    ...updateData,
    website: finalWebsite || undefined,
    pinned_repos: finalPinnedRepos,
    custom_fields: mergedCustomFields
  };

  if (local && (local.id === userId || local.username === (updateData as any).username || !local.id)) {
    saveStoredProfile(updatedUser);
  }

  // Also update cached allUsers so other views reflect the update immediately
  try {
    const cachedUsers = loadStoredAllUsers();
    const idx = cachedUsers.findIndex(
      (u) => u.id === userId || (u.username && updateData.username && u.username.toLowerCase() === updateData.username.toLowerCase())
    );
    if (idx !== -1) {
      cachedUsers[idx] = {
        ...cachedUsers[idx],
        ...updateData,
        custom_fields: mergedCustomFields
      };
      saveStoredAllUsers(cachedUsers);
    } else {
      cachedUsers.push({
        ...updatedUser,
        id: userId,
        custom_fields: mergedCustomFields
      });
      saveStoredAllUsers(cachedUsers);
    }
  } catch {}

  // Map frontend fields to PostgreSQL table column names
  const sanitizedUpdate: Record<string, any> = {
    updated_at: new Date().toISOString(),
    custom_fields: mergedCustomFields
  };

  if ('isAdmin' in updateData) {
    sanitizedUpdate.is_admin = Boolean(updateData.isAdmin);
  }
  if ('savedPostIds' in updateData) {
    sanitizedUpdate.saved_post_ids = updateData.savedPostIds || [];
  }

  for (const [key, val] of Object.entries(updateData)) {
    if (ALLOWED_PROFILE_COLUMNS.has(key)) {
      sanitizedUpdate[key] = val;
    }
  }

  if (finalPinnedRepos !== undefined) {
    sanitizedUpdate.pinned_repos = finalPinnedRepos;
  }
  if (finalWebsite !== undefined) {
    sanitizedUpdate.website = finalWebsite;
  }

  return resilientSupabaseUpdate('profiles', 'id', userId, sanitizedUpdate);
}

export async function deleteUserFromSupabase(userId: string): Promise<void> {
  const client = getSupabaseClient();
  const config = getSupabaseConfig();

  if (client) {
    try {
      const { error } = await client.from('profiles').delete().eq('id', userId);
      if (error) {
        console.warn('Supabase user delete error:', error.message || error);
      }
    } catch (err) {
      console.warn('Supabase user delete exception:', err);
    }
  }

  if (config.url && config.anonKey) {
    try {
      const cleanUrl = config.url.replace(/\/+$/, '');
      fetch(`${cleanUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'return=minimal'
        }
      }).catch(() => {});
    } catch {}
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
    id: 'spark',
    label: 'Spark Destekçi',
    description: 'Code4Ever açık kaynak projesine maddi destekte bulunan özel Spark destekçi rozetidir. 250MB tek seferde dosya yükleme ayrıcalığı tanır.',
    color: '#f59e0b',
    icon: 'sparkles',
    weight: 7,
    isDefault: true
  },
  {
    id: 'beta_home',
    label: 'Kapalı Beta Katılımcısı',
    description: 'Code4Ever platformunun erken aşama kapalı beta test sürecine katılıp platforma destek veren üyelere verilen yeşil ev rozetidir.',
    color: '#10b981',
    icon: 'home',
    weight: 6,
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
      const parsed: BadgeDefinition[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const ids = new Set(parsed.map((b) => b.id));
        const merged = [...parsed];
        DEFAULT_BADGE_DEFINITIONS.forEach((def) => {
          if (!ids.has(def.id)) {
            merged.push(def);
          }
        });
        return merged;
      }
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

const activeChatChannels = new Map<string, any>();

function getOrCreateChatChannel(conversationId: string) {
  const client = getSupabaseClient();
  if (!client) return null;
  const cleanId = (conversationId || 'general').trim().toLowerCase();
  const topic = `c4e_room_${cleanId}`;

  if (activeChatChannels.has(cleanId)) {
    const existing = activeChatChannels.get(cleanId);
    if (existing && existing.state !== 'closed') {
      return existing;
    }
  }

  const channel = client.channel(topic);
  activeChatChannels.set(cleanId, channel);
  return channel;
}

export function loadStoredMessages(conversationId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (m) => m && typeof m === 'object' && m.id && m.sender_username && !(m as any).action
        );
      }
    }
  } catch {}
  return [];
}

export function saveStoredMessages(conversationId: string, messages: ChatMessage[]): void {
  try {
    const valid = (messages || []).filter(
      (m) => m && typeof m === 'object' && m.id && m.sender_username && !(m as any).action
    );
    localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`, JSON.stringify(valid));
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

/**
 * Fetches user's conversation threads from Supabase messages table and synchronizes with local storage.
 */
export async function fetchUserConversationsFromSupabase(
  currentUsername: string
): Promise<Record<string, { lastMessage: ChatMessage; otherUsername: string }>> {
  const cleanUser = (currentUsername || '').toLowerCase().trim();
  const map = getActiveConversationsMap(cleanUser);
  const client = getSupabaseClient();
  if (!client || !cleanUser) return map;

  try {
    const { data, error } = await client
      .from('messages')
      .select('*')
      .or(`sender_username.ilike.${cleanUser},conversation_id.ilike.%${cleanUser}%`)
      .order('created_at', { ascending: true })
      .limit(400);

    if (!error && Array.isArray(data) && data.length > 0) {
      const convMap = new Map<string, ChatMessage[]>();
      data.forEach((item: any) => {
        if (item && item.conversation_id && item.id) {
          const cid = item.conversation_id;
          const list = convMap.get(cid) || [];
          list.push(item as ChatMessage);
          convMap.set(cid, list);
        }
      });

      convMap.forEach((msgs, convId) => {
        const localMsgs = loadStoredMessages(convId);
        const idMap = new Map<string, ChatMessage>();
        localMsgs.forEach((m) => idMap.set(m.id, m));
        msgs.forEach((m) => idMap.set(m.id, m));
        const merged = Array.from(idMap.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        saveStoredMessages(convId, merged);

        if (convId.startsWith('dm_')) {
          const parts = convId.replace('dm_', '').split('_');
          const other = parts.find((p) => p.toLowerCase() !== cleanUser) || parts[0];
          if (merged.length > 0) {
            map[convId] = {
              lastMessage: merged[merged.length - 1],
              otherUsername: other
            };
          }
        }
      });
    }
  } catch (err) {
    console.warn('fetchUserConversationsFromSupabase error:', err);
  }

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

  const removeAndEmit = (messageId: string) => {
    const current = loadStoredMessages(conversationId);
    const filtered = current.filter((m) => m.id !== messageId);
    saveStoredMessages(conversationId, filtered);
    onUpdate(filtered);
  };

  const updateAndEmit = (messageId: string, updatedFields: Partial<ChatMessage>) => {
    const current = loadStoredMessages(conversationId);
    const updated = current.map((m) => (m.id === messageId ? { ...m, ...updatedFields } : m));
    saveStoredMessages(conversationId, updated);
    onUpdate(updated);
  };

  // Same-window broadcast event listener
  const handleCustomEvent = (e: any) => {
    if (e.detail) {
      if (e.detail.action === 'delete_msg' && e.detail.conversation_id === conversationId) {
        removeAndEmit(e.detail.messageId);
      } else if (e.detail.action === 'edit_msg' && e.detail.conversation_id === conversationId) {
        updateAndEmit(e.detail.messageId, {
          content: e.detail.content,
          decrypted_text: e.detail.decrypted_text,
          is_edited: true,
          updated_at: new Date().toISOString()
        });
      } else if (e.detail.conversation_id === conversationId && !e.detail.action && e.detail.id && e.detail.sender_username) {
        mergeAndEmit([e.detail]);
      }
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
  const channel = getOrCreateChatChannel(conversationId);
  if (channel) {
    channel
      .on('broadcast', { event: 'new_msg' }, ({ payload }: any) => {
        if (payload && (payload as ChatMessage).conversation_id?.toLowerCase() === conversationId.toLowerCase()) {
          mergeAndEmit([payload as ChatMessage]);
        }
      })
      .on('broadcast', { event: 'edit_msg' }, ({ payload }: any) => {
        if (payload && payload.conversation_id?.toLowerCase() === conversationId.toLowerCase() && payload.messageId) {
          updateAndEmit(payload.messageId, {
            content: payload.content,
            decrypted_text: payload.decrypted_text,
            is_edited: true,
            updated_at: new Date().toISOString()
          });
        }
      })
      .on('broadcast', { event: 'delete_msg' }, ({ payload }: any) => {
        if (payload && payload.conversation_id?.toLowerCase() === conversationId.toLowerCase() && payload.messageId) {
          removeAndEmit(payload.messageId);
        }
      })
      .on('broadcast', { event: 'mark_read' }, ({ payload }: any) => {
        if (payload && payload.conversation_id?.toLowerCase() === conversationId.toLowerCase()) {
          const current = loadStoredMessages(conversationId);
          const updated = current.map((m) =>
            m.sender_username !== payload.readerUsername ? { ...m, status: 'read' as const } : m
          );
          saveStoredMessages(conversationId, updated);
          onUpdate(updated);
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
        (payload: any) => {
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
        (payload: any) => {
          if (payload.new) {
            updateAndEmit(payload.new.id, payload.new as Partial<ChatMessage>);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: any) => {
          if (payload.old && payload.old.id) {
            removeAndEmit(payload.old.id);
          }
        }
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener('c4e_message_broadcast', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
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
    if (!newMsg || (newMsg as any).action || !newMsg.id || !newMsg.sender_username) {
      return;
    }
    if (newMsg.sender_username.toLowerCase() === cleanUser) {
      return; // Ignore own messages
    }

    const convId = (newMsg.conversation_id || '').toLowerCase();
    // Check if DM involves this user OR if user belongs to group
    const isUserDM = convId.startsWith('dm_') && convId.includes(cleanUser);
    const groups = loadStoredGroups();
    const isUserGroup = groups.some(
      (g) => g.id === newMsg.conversation_id && g.members?.some((m) => (m.username || '').toLowerCase() === cleanUser)
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
    if (e.detail && !e.detail.action && e.detail.id && e.detail.sender_username) {
      handleIncoming(e.detail);
    }
  };
  window.addEventListener('c4e_message_broadcast', handleCustom);

  const client = getSupabaseClient();
  if (client && !userIncomingMessageChannels.has(cleanUser)) {
    const channelTopic = `c4e_user_${cleanUser}`;
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

    // Global message broadcast subscriber as reliable network fallback
    const globalChannel = client
      .channel(`c4e_global_feed_sub_${cleanUser}`)
      .on('broadcast', { event: 'incoming_msg' }, ({ payload }) => {
        if (payload) handleIncoming(payload as ChatMessage);
      })
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
    // 1. Broadcast to deterministic room channel
    const roomChannel = getOrCreateChatChannel(message.conversation_id);
    if (roomChannel) {
      if (roomChannel.state === 'joined' || roomChannel.state === 'subscribed') {
        roomChannel.send({
          type: 'broadcast',
          event: 'new_msg',
          payload: message
        });
      } else {
        roomChannel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            roomChannel.send({
              type: 'broadcast',
              event: 'new_msg',
              payload: message
            });
          }
        });
      }
    }

    // 2. Broadcast to recipient notification channel if direct message
    if (message.conversation_id.toLowerCase().startsWith('dm_')) {
      const parts = message.conversation_id.replace('dm_', '').split('_');
      const otherUsername = parts.find((p) => p.toLowerCase() !== message.sender_username.toLowerCase());
      if (otherUsername) {
        const userNotifyChan = client.channel(`c4e_user_${otherUsername.toLowerCase()}`);
        userNotifyChan.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            userNotifyChan.send({
              type: 'broadcast',
              event: 'incoming_msg',
              payload: message
            }).finally(() => {
              client.removeChannel(userNotifyChan);
            });
          }
        });
      }
    }

    // Global broadcast channel fallback
    const globalChannel = client.channel('c4e_global_msg_feed');
    globalChannel.subscribe((status: string) => {
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

    // 3. Database persistence with resilient payload fallback
    try {
      const dbPayload: Record<string, any> = {
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
        encryption_duration_ms: message.encryption_duration_ms || 0
      };
      if (message.reply_to) {
        dbPayload.reply_to = message.reply_to;
      }

      const { error } = await client.from('messages').insert(dbPayload);
      if (error) {
        delete dbPayload.reply_to;
        delete dbPayload.encryption_duration_ms;
        await client.from('messages').insert(dbPayload);
      }
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
      const roomChannel = getOrCreateChatChannel(conversationId);
      if (roomChannel) {
        roomChannel.send({
          type: 'broadcast',
          event: 'mark_read',
          payload: { conversation_id: conversationId, readerUsername }
        });
      }

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

export async function editMessageService(
  conversationId: string,
  messageId: string,
  newContent: string,
  decryptedText?: string
): Promise<void> {
  const current = loadStoredMessages(conversationId);
  const updated = current.map((m) => {
    if (m.id === messageId) {
      return {
        ...m,
        content: newContent,
        decrypted_text: decryptedText !== undefined ? decryptedText : m.decrypted_text,
        is_edited: true,
        updated_at: new Date().toISOString()
      };
    }
    return m;
  });
  saveStoredMessages(conversationId, updated);

  // Broadcast window event for local instant reactivity
  window.dispatchEvent(
    new CustomEvent('c4e_message_broadcast', {
      detail: {
        action: 'edit_msg',
        conversation_id: conversationId,
        messageId,
        content: newContent,
        decrypted_text: decryptedText
      }
    })
  );

  const client = getSupabaseClient();
  if (client) {
    const roomChannel = getOrCreateChatChannel(conversationId);
    if (roomChannel) {
      roomChannel.send({
        type: 'broadcast',
        event: 'edit_msg',
        payload: { conversation_id: conversationId, messageId, content: newContent, decrypted_text: decryptedText }
      });
    }

    try {
      await client
        .from('messages')
        .update({
          content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);
    } catch (err) {
      console.warn('Supabase message edit error:', err);
    }
  }
}

export async function deleteMessageService(conversationId: string, messageId: string): Promise<void> {
  const current = loadStoredMessages(conversationId);
  const updated = current.filter((m) => m.id !== messageId);
  saveStoredMessages(conversationId, updated);

  // Broadcast window event for local instant reactivity
  window.dispatchEvent(
    new CustomEvent('c4e_message_broadcast', {
      detail: {
        action: 'delete_msg',
        conversation_id: conversationId,
        messageId
      }
    })
  );

  const client = getSupabaseClient();
  if (client) {
    const roomChannel = getOrCreateChatChannel(conversationId);
    if (roomChannel) {
      roomChannel.send({
        type: 'broadcast',
        event: 'delete_msg',
        payload: { conversation_id: conversationId, messageId }
      });
    }

    try {
      await client.from('messages').delete().eq('id', messageId);
    } catch (err) {
      console.warn('Supabase message delete error:', err);
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
        if (!error && Array.isArray(data)) {
          const clean = (data as ChatGroup[]).filter((g) => g && g.id);
          saveStoredGroups(clean);
          onUpdate(clean);
        } else {
          onUpdate(loadStoredGroups());
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

// -------------------------------------------------------------
// DYNAMIC CATEGORIES PERSISTENCE & DISCOVERY
// -------------------------------------------------------------

export function loadStoredCategories(): PostCategory[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_CATEGORIES;
}

export function saveStoredCategories(categories: PostCategory[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories));
  } catch {}
}

export function getPlatformCategories(posts: Post[] = []): PostCategory[] {
  const stored = loadStoredCategories();
  const categoryMap = new Map<string, PostCategory>();

  // 1. Add stored categories
  stored.forEach((cat) => {
    categoryMap.set(cat.id.toLowerCase(), cat);
  });

  // 2. Discover custom categories created on posts
  posts.forEach((p) => {
    if (p.category && p.category !== 'all') {
      const catId = p.category.toLowerCase().trim();
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          id: catId,
          name_tr: p.category_name || p.category,
          name_en: p.category_name || p.category,
          icon: 'Tag',
          color: '#3b82f6'
        });
      }
    }
  });

  return Array.from(categoryMap.values());
}

export function createOrAddCategory(name: string): PostCategory {
  const cleanName = sanitizeText(name, 40).trim();
  const catId = cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 30) || `cat_${Date.now()}`;
  
  const current = loadStoredCategories();
  const existing = current.find((c) => c.id === catId || c.name_tr.toLowerCase() === cleanName.toLowerCase());
  if (existing) return existing;

  const newCat: PostCategory = {
    id: catId,
    name_tr: cleanName,
    name_en: cleanName,
    icon: 'Tag',
    color: '#3b82f6'
  };

  const updated = [...current, newCat];
  saveStoredCategories(updated);
  return newCat;
}

// -------------------------------------------------------------
// SYSTEM ERROR REPORTS (FOR WEBHOOKS, APIS, UI RUNTIME & USER REPORTS)
// -------------------------------------------------------------

export function loadStoredSystemErrorReports(): SystemErrorReport[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SYSTEM_ERROR_REPORTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredSystemErrorReports(reports: SystemErrorReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_ERROR_REPORTS, JSON.stringify(reports));
  } catch {}
}

export async function reportSystemErrorInSupabase(
  reportData: Omit<SystemErrorReport, 'id' | 'created_at' | 'status'> & { id?: string }
): Promise<{ success: boolean; id: string; error?: string }> {
  const id = reportData.id || `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullReport: SystemErrorReport = {
    id,
    error_type: reportData.error_type || 'general_issue',
    location: sanitizeText(reportData.location, 200) || 'Bilinmeyen Konum',
    description: sanitizeText(reportData.description, 2000) || 'Açıklama belirtilmedi.',
    logs: typeof reportData.logs === 'string' ? reportData.logs : JSON.stringify(reportData.logs, null, 2),
    reporter_username: sanitizeText(reportData.reporter_username, 60) || 'anonim',
    reporter_display_name: sanitizeText(reportData.reporter_display_name, 60) || 'Kullanıcı',
    reporter_avatar: reportData.reporter_avatar,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  // 1. Save to local cache
  const local = loadStoredSystemErrorReports();
  const updatedLocal = [fullReport, ...local.filter((r) => r.id !== id)];
  saveStoredSystemErrorReports(updatedLocal);

  // 2. Dispatch local broadcast
  try {
    window.dispatchEvent(new CustomEvent('c4e_system_error_broadcast', { detail: { report: fullReport } }));
  } catch {}

  // 3. Send Supabase broadcast
  const client = getSupabaseClient();
  if (client) {
    try {
      client.channel('public:system_error_reports').send({
        type: 'broadcast',
        event: 'new_error_report',
        payload: fullReport
      });
    } catch {}
  }

  // 4. Resilient upsert to Supabase
  const payload: Record<string, any> = {
    id: fullReport.id,
    error_type: fullReport.error_type,
    location: fullReport.location,
    description: fullReport.description,
    logs: fullReport.logs,
    reporter_username: fullReport.reporter_username,
    reporter_display_name: fullReport.reporter_display_name,
    reporter_avatar: fullReport.reporter_avatar,
    status: fullReport.status,
    created_at: fullReport.created_at
  };

  const result = await resilientSupabaseUpsert('system_error_reports', payload);
  return { success: true, id, error: result.error };
}

export async function getSystemErrorReportsFromSupabase(): Promise<SystemErrorReport[]> {
  const client = getSupabaseClient();
  const local = loadStoredSystemErrorReports();
  const map = new Map<string, SystemErrorReport>();

  if (client) {
    try {
      const { data, error } = await client
        .from('system_error_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error && Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item && item.id) {
            map.set(item.id, item as SystemErrorReport);
          }
        });
      }
    } catch (err) {
      console.warn('Supabase get error reports error:', err);
    }
  }

  // Merge recent local reports (< 10 mins)
  const now = Date.now();
  local.forEach((r) => {
    if (r && r.id && !map.has(r.id)) {
      const t = new Date(r.created_at || '').getTime();
      if (!isNaN(t) && now - t < 10 * 60 * 1000) {
        map.set(r.id, r);
      }
    }
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  );

  saveStoredSystemErrorReports(merged);
  return merged;
}

export function subscribeToSystemErrorReports(onUpdate: (reports: SystemErrorReport[]) => void): () => void {
  const client = getSupabaseClient();

  const refreshAndNotify = async () => {
    const list = await getSystemErrorReportsFromSupabase();
    onUpdate(list);
  };

  // 1. Initial Load
  onUpdate(loadStoredSystemErrorReports());
  refreshAndNotify();

  // 2. Window event listener
  const handleLocalBroadcast = (e: any) => {
    if (e.detail?.report) {
      const rep = e.detail.report as SystemErrorReport;
      const current = loadStoredSystemErrorReports();
      const updated = [rep, ...current.filter((r) => r.id !== rep.id)];
      saveStoredSystemErrorReports(updated);
      onUpdate(updated);
    } else if (e.detail?.deletedId) {
      const current = loadStoredSystemErrorReports().filter((r) => r.id !== e.detail.deletedId);
      saveStoredSystemErrorReports(current);
      onUpdate(current);
    }
  };
  window.addEventListener('c4e_system_error_broadcast', handleLocalBroadcast);

  // 3. Multi-tab storage event
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.SYSTEM_ERROR_REPORTS) {
      onUpdate(loadStoredSystemErrorReports());
    }
  };
  window.addEventListener('storage', handleStorage);

  if (!client) {
    return () => {
      window.removeEventListener('c4e_system_error_broadcast', handleLocalBroadcast);
      window.removeEventListener('storage', handleStorage);
    };
  }

  // 4. Supabase Realtime channel
  const channel = client
    .channel('public:system_error_reports')
    .on('broadcast', { event: 'new_error_report' }, ({ payload }) => {
      if (payload?.id) {
        const item = payload as SystemErrorReport;
        const current = loadStoredSystemErrorReports();
        const updated = [item, ...current.filter((r) => r.id !== item.id)];
        saveStoredSystemErrorReports(updated);
        onUpdate(updated);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'system_error_reports' }, async () => {
      refreshAndNotify();
    })
    .subscribe();

  // 5. Active background polling
  const pollInterval = setInterval(() => {
    refreshAndNotify();
  }, 4000);

  return () => {
    clearInterval(pollInterval);
    window.removeEventListener('c4e_system_error_broadcast', handleLocalBroadcast);
    window.removeEventListener('storage', handleStorage);
    client.removeChannel(channel);
  };
}

export async function deleteSystemErrorReportInSupabase(reportId: string): Promise<void> {
  // 1. Remove from local
  const current = loadStoredSystemErrorReports();
  const updated = current.filter((r) => r.id !== reportId);
  saveStoredSystemErrorReports(updated);

  try {
    window.dispatchEvent(new CustomEvent('c4e_system_error_broadcast', { detail: { deletedId: reportId } }));
  } catch {}

  // 2. Delete from Supabase
  const client = getSupabaseClient();
  const config = getSupabaseConfig();

  if (client) {
    try {
      await client.from('system_error_reports').delete().eq('id', reportId);
    } catch (err) {
      console.warn('Supabase delete error report exception:', err);
    }
  }

  if (config.url && config.anonKey) {
    try {
      const cleanUrl = config.url.replace(/\/+$/, '');
      fetch(`${cleanUrl}/rest/v1/system_error_reports?id=eq.${encodeURIComponent(reportId)}`, {
        method: 'DELETE',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'return=minimal'
        }
      }).catch(() => {});
    } catch {}
  }
}

// -------------------------------------------------------------
// POST REPORTS (REPORT A POST FOR VIOLATION / SPAM / AD / HATE)
// -------------------------------------------------------------

export function loadStoredPostReports(): PostReport[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.POST_REPORTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredPostReports(reports: PostReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.POST_REPORTS, JSON.stringify(reports));
  } catch {}
}

export async function reportPostInSupabase(
  reportData: Omit<PostReport, 'id' | 'created_at' | 'status'> & { id?: string }
): Promise<{ success: boolean; id: string; error?: string }> {
  const id = reportData.id || `prep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullReport: PostReport = {
    id,
    post_id: reportData.post_id,
    post_author_username: reportData.post_author_username,
    post_content: sanitizeText(reportData.post_content, 1000),
    reporter_username: sanitizeText(reportData.reporter_username, 60),
    reporter_display_name: sanitizeText(reportData.reporter_display_name || '', 60),
    reason: reportData.reason || 'other',
    reason_label: reportData.reason_label || 'Şikayet / İhlal',
    details: sanitizeText(reportData.details || '', 1000),
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const local = loadStoredPostReports();
  const updatedLocal = [fullReport, ...local.filter((r) => r.id !== id)];
  saveStoredPostReports(updatedLocal);

  try {
    window.dispatchEvent(new CustomEvent('c4e_post_report_broadcast', { detail: { report: fullReport } }));
  } catch {}

  const client = getSupabaseClient();
  if (client) {
    try {
      client.channel('public:post_reports').send({
        type: 'broadcast',
        event: 'new_post_report',
        payload: fullReport
      });
    } catch {}
  }

  const payload: Record<string, any> = {
    id: fullReport.id,
    post_id: fullReport.post_id,
    post_author_username: fullReport.post_author_username,
    post_content: fullReport.post_content,
    reporter_username: fullReport.reporter_username,
    reporter_display_name: fullReport.reporter_display_name,
    reason: fullReport.reason,
    reason_label: fullReport.reason_label,
    details: fullReport.details,
    status: fullReport.status,
    created_at: fullReport.created_at
  };

  const result = await resilientSupabaseUpsert('post_reports', payload);
  return { success: true, id, error: result.error };
}

export async function getPostReportsFromSupabase(): Promise<PostReport[]> {
  const client = getSupabaseClient();
  const local = loadStoredPostReports();
  const map = new Map<string, PostReport>();

  if (client) {
    try {
      const { data, error } = await client
        .from('post_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error && Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item && item.id) {
            map.set(item.id, item as PostReport);
          }
        });
      }
    } catch (err) {
      console.warn('Supabase get post reports error:', err);
    }
  }

  // Merge recent local reports (< 10 mins)
  const now = Date.now();
  local.forEach((r) => {
    if (r && r.id && !map.has(r.id)) {
      const t = new Date(r.created_at || '').getTime();
      if (!isNaN(t) && now - t < 10 * 60 * 1000) {
        map.set(r.id, r);
      }
    }
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  );

  saveStoredPostReports(merged);
  return merged;
}

export function subscribeToPostReports(onUpdate: (reports: PostReport[]) => void): () => void {
  const client = getSupabaseClient();

  const refreshAndNotify = async () => {
    const list = await getPostReportsFromSupabase();
    onUpdate(list);
  };

  // 1. Initial Load
  onUpdate(loadStoredPostReports());
  refreshAndNotify();

  // 2. Window event listener
  const handleLocalBroadcast = (e: any) => {
    if (e.detail?.report) {
      const rep = e.detail.report as PostReport;
      const current = loadStoredPostReports();
      const updated = [rep, ...current.filter((r) => r.id !== rep.id)];
      saveStoredPostReports(updated);
      onUpdate(updated);
    } else if (e.detail?.deletedId) {
      const current = loadStoredPostReports().filter((r) => r.id !== e.detail.deletedId);
      saveStoredPostReports(current);
      onUpdate(current);
    }
  };
  window.addEventListener('c4e_post_report_broadcast', handleLocalBroadcast);

  // 3. Multi-tab storage event
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.POST_REPORTS) {
      onUpdate(loadStoredPostReports());
    }
  };
  window.addEventListener('storage', handleStorage);

  if (!client) {
    return () => {
      window.removeEventListener('c4e_post_report_broadcast', handleLocalBroadcast);
      window.removeEventListener('storage', handleStorage);
    };
  }

  // 4. Supabase Realtime channel
  const channel = client
    .channel('public:post_reports')
    .on('broadcast', { event: 'new_post_report' }, ({ payload }) => {
      if (payload?.id) {
        const item = payload as PostReport;
        const current = loadStoredPostReports();
        const updated = [item, ...current.filter((r) => r.id !== item.id)];
        saveStoredPostReports(updated);
        onUpdate(updated);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reports' }, async () => {
      refreshAndNotify();
    })
    .subscribe();

  // 5. Active background polling
  const pollInterval = setInterval(() => {
    refreshAndNotify();
  }, 4000);

  return () => {
    clearInterval(pollInterval);
    window.removeEventListener('c4e_post_report_broadcast', handleLocalBroadcast);
    window.removeEventListener('storage', handleStorage);
    client.removeChannel(channel);
  };
}

export async function deletePostReportInSupabase(reportId: string): Promise<void> {
  const current = loadStoredPostReports();
  const updated = current.filter((r) => r.id !== reportId);
  saveStoredPostReports(updated);

  try {
    window.dispatchEvent(new CustomEvent('c4e_post_report_broadcast', { detail: { deletedId: reportId } }));
  } catch {}

  const client = getSupabaseClient();
  const config = getSupabaseConfig();

  if (client) {
    try {
      await client.from('post_reports').delete().eq('id', reportId);
    } catch (err) {
      console.warn('Supabase delete post report error:', err);
    }
  }

  if (config.url && config.anonKey) {
    try {
      const cleanUrl = config.url.replace(/\/+$/, '');
      fetch(`${cleanUrl}/rest/v1/post_reports?id=eq.${encodeURIComponent(reportId)}`, {
        method: 'DELETE',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'return=minimal'
        }
      }).catch(() => {});
    } catch {}
  }
}



