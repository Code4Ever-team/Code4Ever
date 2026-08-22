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
  allow_group_invites?: boolean; // Privacy setting: allow group invites
  is_online?: boolean;
  last_seen_at?: string;
  integrations?: WebhookIntegrationSettings;
}

export interface GroupMember {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  avatar_url: string;
  description?: string;
  creator_id: string;
  creator_username: string;
  admins: string[]; // usernames
  members: GroupMember[];
  last_message?: {
    text: string;
    sender_username: string;
    sender_name: string;
    timestamp: string;
  };
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  group_name: string;
  group_avatar: string;
  group_description?: string;
  invited_by_username: string;
  invited_by_name: string;
  invited_by_avatar: string;
  target_username: string;
  target_user_id?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string; // channel_id or group_id
  is_group?: boolean;
  sender_id: string;
  sender_username: string;
  sender_display_name: string;
  sender_avatar: string;
  content: string; // E2EE encrypted ciphertext `e2ee:...`
  decrypted_text?: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'file' | 'code';
  media_name?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  created_at: string;
  encryption_duration_ms?: number;
  reply_to?: {
    id: string;
    sender_username: string;
    text: string;
  };
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
  category?: string; // e.g. 'general', 'frontend', 'backend', 'ai_ml', 'security', 'mobile', 'devops', 'gamedev', 'qa', 'showcase'
  category_name?: string;
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
  type: 'like' | 'star' | 'comment' | 'community' | 'repost' | 'follow' | 'job_application' | 'job_listing' | 'group_invite' | 'message';
  recipient_id?: string;
  actor: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  content: string;
  time_ago: string;
  is_read: boolean;
  target_id?: string;
  created_at?: string;
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
  api_key?: string;
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

export interface PostCategory {
  id: string;
  name_tr: string;
  name_en: string;
  icon: string;
  color: string;
  description_tr?: string;
  description_en?: string;
}

export const POST_CATEGORIES: PostCategory[] = [
  { id: 'general', name_tr: 'Genel & Sohbet', name_en: 'General & Chat', icon: 'Globe', color: '#64748b', description_tr: 'Genel geliştirici sohbetleri ve paylaşımlar', description_en: 'General developer discussions' },
  { id: 'frontend', name_tr: 'Frontend & UI', name_en: 'Frontend & UI', icon: 'Layout', color: '#38bdf8', description_tr: 'React, Vue, Tailwind, CSS ve modern arayüzler', description_en: 'React, Vue, Tailwind, CSS and modern UI' },
  { id: 'backend', name_tr: 'Backend & API', name_en: 'Backend & API', icon: 'Server', color: '#10b981', description_tr: 'Node.js, Go, Python, PostgreSQL, mikroservisler', description_en: 'Node.js, Go, Python, PostgreSQL, microservices' },
  { id: 'ai_ml', name_tr: 'Yapay Zeka & ML', name_en: 'AI & Machine Learning', icon: 'Brain', color: '#a855f7', description_tr: 'LLM, Gemini, PyTorch, model geliştirme', description_en: 'LLMs, Gemini, PyTorch, AI agents' },
  { id: 'security', name_tr: 'Siber Güvenlik', name_en: 'Cyber Security', icon: 'ShieldCheck', color: '#ef4444', description_tr: 'E2EE, sızma testleri, kriptografi, güvenli kodlama', description_en: 'E2EE, pentesting, cryptography, secure code' },
  { id: 'mobile', name_tr: 'Mobil Geliştirme', name_en: 'Mobile Dev', icon: 'Smartphone', color: '#f59e0b', description_tr: 'React Native, Flutter, Swift, Kotlin', description_en: 'React Native, Flutter, Swift, Kotlin' },
  { id: 'devops', name_tr: 'DevOps & Cloud', name_en: 'DevOps & Cloud', icon: 'Cloud', color: '#06b6d4', description_tr: 'Docker, Kubernetes, CI/CD, AWS, Cloud Run', description_en: 'Docker, Kubernetes, CI/CD, AWS, Cloud Run' },
  { id: 'gamedev', name_tr: 'Oyun Geliştirme', name_en: 'Game Dev', icon: 'Gamepad2', color: '#ec4899', description_tr: 'Unity, Unreal, Godot, WebGL, Shader', description_en: 'Unity, Unreal, Godot, WebGL, Shader' },
  { id: 'qa', name_tr: 'Soru & Cevap', name_en: 'Q&A / Help', icon: 'HelpCircle', color: '#eab308', description_tr: 'Hata çözümleri, teknik sorular ve yardımlaşma', description_en: 'Bug fixes, technical questions and help' },
  { id: 'showcase', name_tr: 'Proje Vitrini', name_en: 'Project Showcase', icon: 'Sparkles', color: '#6366f1', description_tr: 'Geliştirdiğiniz projeleri ve demoları tanıtın', description_en: 'Showcase your projects, builds and demos' }
];

export interface WebhookIntegrationSettings {
  discord: {
    enabled: boolean;
    webhook_url: string;
    bot_name?: string;
    avatar_url?: string;
  };
  jubbio: {
    enabled: boolean;
    webhook_url: string;
    bot_token?: string;
    guild_id?: string;
    channel_id?: string;
  };
  telegram: {
    enabled: boolean;
    bot_token: string;
    chat_id: string;
  };
  message_template: string;
}

export const DEFAULT_WEBHOOK_TEMPLATE = `📢 **Yeni Ekip / İş İlanı Başvurusu!**

📋 **İlan Adı:** {joblist}
👥 **Kontenjan:** {quota}
👤 **Başvuran:** {username}

💬 **Başvuru Açıklaması / Deneyim:**
> {des}

🔗 İncelemek ve yanıtlamak için Code4Ever platformunu ziyaret edin: https://app.lanux.online/`;

