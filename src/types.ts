export interface BadgeItem {
  id: string;
  label: string;
  color?: string; // e.g. '#10b981', '#ef4444', '#a855f7', '#f59e0b'
  icon?: string;  // e.g. 'home', 'check', 'code', 'shield', 'star', 'sparkles', 'git', 'award'
  description?: string;
}

export interface BadgeDefinition {
  id: string;
  label: string;
  description: string;
  color: string;
  icon: 'code' | 'shield' | 'check' | 'star' | 'home' | 'sparkles' | 'award' | 'git';
  weight: number;
  isDefault?: boolean;
}

export interface PlatformSettings {
  brandTitle: string;
  brandDomain: string;
  brandDescription?: string;
  brandSlogan?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UserSubscriptionInfo {
  planId: string;
  planName: string;
  assignedAt: string;
  expiresAt?: string; // ISO string or undefined for lifetime
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  banner_url: string;
  bio: string;
  role: string;
  isAdmin?: boolean;
  website?: string;
  pinned_repos?: GitHubRepo[];
  verified?: boolean;
  theme_color?: string;
  accent_color?: string;
  custom_fields?: Record<string, string>;
  joined_communities?: string[];
  created_at?: string;
  updated_at?: string;
  email?: string;
  is_github_connected?: boolean;
  github_username?: string;
  badges?: BadgeItem[];
  betaStatus?: 'pending' | 'approved' | 'rejected';
  betaContact?: string;
  isBanned?: boolean;
  banReason?: string;
  suspendedUntil?: string; // ISO string if temporarily suspended
  subscription?: UserSubscriptionInfo;
  saved_post_ids?: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string; // e.g. 'Aylık' | 'Yıllık' | 'Süresiz'
  description: string;
  features: string[];
  badgeId?: string;
  badgeLabel?: string;
  badgeColor?: string;
  badgeIcon?: string;
  isActive: boolean;
  popular?: boolean;
}

export interface ClosedBetaSettings {
  isActive: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface DynamicTheme {
  primaryHue: number;
  dominantColor: string;
  accentColor: string;
  glowColor: string;
  glassBorder: string;
  cardBg: string;
  textShade: string;
}

export interface ProjectCard {
  id: string;
  title: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  badge_color?: string;
  code_snippet?: string;
}

export interface CodeSnippet {
  title: string;
  language: string;
  code: string;
}

export interface PostComment {
  id: string;
  author: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  content: string;
  created_at: string;
}

export interface Post {
  id: string;
  author: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  time_ago: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  project_card?: ProjectCard;
  code_snippet?: CodeSnippet;
  community_id?: string;
  community_name?: string;
  community_handle?: string;
  comments?: PostComment[];
  comments_count: number;
  reposts_count: number;
  likes_count: number;
  liked_by?: string[];
  reposted_by?: string[];
  bookmarked_by?: string[];
  is_liked?: boolean;
  is_reposted?: boolean;
  is_bookmarked?: boolean;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  type: 'like' | 'star' | 'comment' | 'community' | 'repost' | 'follow' | 'job_application' | 'job_listing';
  actor: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  content: string;
  time_ago: string;
  is_read: boolean;
  target_id?: string;
}

export interface JobApplication {
  id: string;
  job_id: string;
  job_title: string;
  applicant_user_id: string;
  applicant_username: string;
  applicant_avatar?: string;
  applicant_display_name?: string;
  name: string; // Adınız
  age: number; // Yaşınız
  experience: string; // Deneyim
  languages: string; // Bildiğiniz Diller
  description: string; // Açıklama
  created_at: string;
  time_ago?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface JobListing {
  id: string;
  type: 'job' | 'team'; // İş İlanı / Ekip İlanı
  title: string; // Başlık
  description: string; // Açıklama
  quota: number; // Kontenjan
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    role?: string;
  };
  status: 'active' | 'closed';
  created_at: string;
  time_ago?: string;
  applications_count?: number;
  applications?: JobApplication[];
  applied_by?: string[]; // list of applicant user IDs / usernames
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string;
  repository_url: string;
  language: string;
  stars: number;
  forks: number;
  is_open_source: boolean;
  license_type: string;
  api_key_required: boolean;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  is_dm: boolean;
  participant: {
    username: string;
    display_name: string;
    avatar_url: string;
    status: string;
  };
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

export interface EncryptedMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  encrypted_payload: string;
  iv: string;
  decrypted_text?: string;
  is_e2ee: boolean;
  created_at: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  currentRequests: number;
  remaining: number;
  resetTime: number;
  isBlocked: boolean;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  endpoint: string;
  ip: string;
  action: string;
  status: 'allowed' | 'blocked' | 'sanitized';
  details: string;
}

export interface Trend {
  id: string;
  tag: string;
  topic?: string;
  category?: string;
  posts_count: number;
}

export interface Community {
  id: string;
  name: string;
  handle: string;
  avatar_url: string;
  banner_url?: string;
  description?: string;
  members_count: number;
  is_joined: boolean;
  created_by?: string;
  creator_username?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  license_key: string;
  tier: string;
  expires_at: string;
  rate_limit: number;
  signature: string;
  error?: string;
}
