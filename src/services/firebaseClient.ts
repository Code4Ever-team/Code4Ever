import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { UserProfile, Post, Community, ClosedBetaSettings, SubscriptionPlan, BadgeDefinition, PlatformSettings } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const configAny = firebaseConfig as any;
const db = configAny.firestoreDatabaseId
  ? getFirestore(app, configAny.firestoreDatabaseId)
  : getFirestore(app);

const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');

export { app, auth, db, githubProvider, onAuthStateChanged };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
}

const STORAGE_KEYS = {
  PROFILE: 'c4e_user_profile',
  POSTS: 'c4e_feed_posts',
  COMMUNITIES: 'c4e_communities',
  AUTH: 'c4e_auth_session',
  LANG: 'c4e_app_language',
  GH_TOKEN: 'c4e_gh_token'
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
  custom_fields: {
    github: 'github.com',
    location: 'Türkiye'
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

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
  if (profile.id) {
    const cleanProfile = sanitizeForFirestore(profile);
    setDoc(doc(db, 'users', profile.id), cleanProfile, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `users/${profile.id}`);
    });
  }
}

export function loadStoredPosts(): Post[] {
  const data = localStorage.getItem(STORAGE_KEYS.POSTS);
  if (data) {
    try {
      const parsed: Post[] = JSON.parse(data);
      return parsed.filter(
        (p) =>
          p.author?.username !== 'devjuno' &&
          !p.content.toLowerCase().includes('devjuno')
      );
    } catch {
      return [];
    }
  }
  return [];
}

export function saveStoredPosts(posts: Post[]): void {
  localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
}

export function subscribeToPosts(onUpdate: (posts: Post[]) => void): () => void {
  const postsRef = collection(db, 'posts');
  return onSnapshot(
    postsRef,
    (snapshot) => {
      let fetchedPosts: Post[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Post, 'id'>)
      }));

      // Remove unwanted devjuno posts
      fetchedPosts = fetchedPosts.filter(
        (p) =>
          p.author?.username !== 'devjuno' &&
          !p.content?.toLowerCase().includes('devjuno')
      );

      // Sort by created_at descending
      fetchedPosts.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      saveStoredPosts(fetchedPosts);
      onUpdate(fetchedPosts);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      onUpdate(loadStoredPosts());
    }
  );
}

export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function createPostInFirestore(post: Post): Promise<void> {
  try {
    const cleanPost = sanitizeForFirestore(post);
    await setDoc(doc(db, 'posts', post.id), cleanPost);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `posts/${post.id}`);
  }
}

export async function updatePostInFirestore(postId: string, updateData: Partial<Post>): Promise<void> {
  try {
    const cleanData = sanitizeForFirestore(updateData);
    await updateDoc(doc(db, 'posts', postId), cleanData as Record<string, any>);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
  }
}

export async function deletePostInFirestore(postId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
  }
}

export function loadStoredCommunities(): Community[] {
  const data = localStorage.getItem(STORAGE_KEYS.COMMUNITIES);
  if (data) {
    try {
      const parsed: Community[] = JSON.parse(data);
      // Remove any leftover mock communities like 'Frontend TR', 'React Türkiye'
      return parsed.filter(
        (c) =>
          !['Frontend TR', 'React Türkiye', 'Open Source TR', 'AI & Machine Learning TR'].includes(c.name)
      );
    } catch {
      return [];
    }
  }
  return [];
}

export function saveStoredCommunities(communities: Community[]): void {
  localStorage.setItem(STORAGE_KEYS.COMMUNITIES, JSON.stringify(communities));
}

export function subscribeToCommunities(onUpdate: (communities: Community[]) => void): () => void {
  return onSnapshot(
    collection(db, 'communities'),
    (snapshot) => {
      const fetchedCommunities: Community[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Community, 'id'>)
      }));
      saveStoredCommunities(fetchedCommunities);
      onUpdate(fetchedCommunities);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'communities');
      onUpdate(loadStoredCommunities());
    }
  );
}

export async function createCommunityInFirestore(community: Community): Promise<void> {
  try {
    const cleanComm = sanitizeForFirestore(community);
    await setDoc(doc(db, 'communities', community.id), cleanComm);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `communities/${community.id}`);
  }
}

export async function updateCommunityInFirestore(communityId: string, updateData: Partial<Community>): Promise<void> {
  try {
    const cleanData = sanitizeForFirestore(updateData);
    await updateDoc(doc(db, 'communities', communityId), cleanData as Record<string, any>);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `communities/${communityId}`);
  }
}

export async function deleteCommunityFromFirestore(communityId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'communities', communityId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `communities/${communityId}`);
  }
}

export function loadLanguage(): 'tr' | 'en' {
  return (localStorage.getItem(STORAGE_KEYS.LANG) as 'tr' | 'en') || 'tr';
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

export async function signInWithGitHubProvider(): Promise<void> {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    const credential = GithubAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      saveGitHubToken(credential.accessToken);
    }
  } catch (error: any) {
    console.warn('Popup login failed or blocked in container frame, attempting redirect flow:', error);
    try {
      await signInWithRedirect(auth, githubProvider);
    } catch (redirectErr) {
      console.error('Redirect sign in error:', redirectErr);
      throw redirectErr;
    }
  }
}

export async function checkAuthRedirect(): Promise<void> {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        saveGitHubToken(credential.accessToken);
      }
    }
  } catch (error: any) {
    if (error?.message?.includes('Database is closing/hidden')) {
      // Ignore transient storage partitioning issues in iframe preview
      return;
    }
    console.warn('Redirect result check notice:', error);
  }
}

export async function logoutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
  localStorage.removeItem(STORAGE_KEYS.GH_TOKEN);
}

export function formatFirebaseUserToProfile(user: User): UserProfile {
  const providerData = (user.providerData?.[0] || {}) as { photoURL?: string };
  const username =
    (user as any).reloadUserInfo?.screenName ||
    user.displayName?.toLowerCase().replace(/\s+/g, '_') ||
    user.email?.split('@')[0] ||
    'developer';

  return {
    id: user.uid,
    username: username.toLowerCase().replace(/\s+/g, '_'),
    display_name: user.displayName || username,
    avatar_url: user.photoURL || providerData.photoURL || `https://unavatar.io/github/${username}`,
    banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    bio: 'Ben Code4Ever Kullanıyorum!',
    role: 'Açık Kaynak Geliştirici',
    verified: false,
    email: user.email || undefined,
    custom_fields: {
      github: `github.com/${username}`,
      location: 'Türkiye'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export async function getOrFormatUserProfile(user: User): Promise<UserProfile> {
  const defaultProfile = formatFirebaseUserToProfile(user);
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const existingData = userSnap.data() as Partial<UserProfile>;
      return {
        ...defaultProfile,
        ...existingData,
        id: user.uid
      };
    }

    const localStored = loadStoredProfile();
    if (localStored && localStored.id === user.uid) {
      const merged = {
        ...defaultProfile,
        ...localStored,
        id: user.uid
      };
      saveStoredProfile(merged);
      return merged;
    }

    saveStoredProfile(defaultProfile);
    return defaultProfile;
  } catch (err) {
    console.warn('Notice fetching user profile doc:', err);
    return defaultProfile;
  }
}

// Subscribe to all registered users (for Admin Panel)
export function subscribeToAllUsers(onUpdate: (users: UserProfile[]) => void): () => void {
  const usersRef = collection(db, 'users');
  return onSnapshot(
    usersRef,
    (snapshot) => {
      const fetchedUsers: UserProfile[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserProfile, 'id'>)
      }));
      onUpdate(fetchedUsers);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      // Fallback to currently stored profile if snapshot fails
      const local = loadStoredProfile();
      onUpdate(local ? [local] : []);
    }
  );
}

// Update specific user profile in Firestore
export async function updateUserProfileInFirestore(userId: string, updateData: Partial<UserProfile>): Promise<void> {
  try {
    const cleanData = sanitizeForFirestore(updateData);
    await setDoc(doc(db, 'users', userId), cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

const BETA_SETTINGS_KEY = 'c4e_closed_beta_settings';

export function loadStoredBetaSettings(): ClosedBetaSettings {
  const data = localStorage.getItem(BETA_SETTINGS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return { isActive: false };
    }
  }
  return { isActive: false };
}

export function subscribeToClosedBetaSettings(onUpdate: (settings: ClosedBetaSettings) => void): () => void {
  const settingsDocRef = doc(db, 'settings', 'closed_beta');
  return onSnapshot(
    settingsDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data() as ClosedBetaSettings;
        localStorage.setItem(BETA_SETTINGS_KEY, JSON.stringify(settings));
        onUpdate(settings);
      } else {
        const stored = loadStoredBetaSettings();
        onUpdate(stored);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/closed_beta');
      onUpdate(loadStoredBetaSettings());
    }
  );
}

export async function saveClosedBetaSettingsInFirestore(settings: ClosedBetaSettings): Promise<void> {
  localStorage.setItem(BETA_SETTINGS_KEY, JSON.stringify(settings));
  try {
    const cleanSettings = sanitizeForFirestore(settings);
    await setDoc(doc(db, 'settings', 'closed_beta'), cleanSettings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/closed_beta');
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
}

const SUBSCRIPTIONS_KEY = 'c4e_subscription_plans';

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_pro',
    name: 'Code4Ever Pro',
    price: '₺49',
    period: 'Aylık',
    description: 'Bireysel geliştiriciler ve kod paylaşıcılar için gelişmiş ayrıcalıklar.',
    features: [
      'Code4Ever Developer Rozeti',
      'Gelişmiş Kod Paylaşım Temaları',
      'Sınırsız EveryChat Yapay Zeka',
      'Profil Özelleştirme Ayrıcalıkları'
    ],
    badgeId: 'c4e_dev',
    badgeLabel: 'Code4Ever Developer',
    badgeColor: '#ef4444',
    badgeIcon: 'code',
    isActive: true,
    popular: true
  },
  {
    id: 'plan_gitplus',
    name: 'Git+ Pro',
    price: '₺99',
    period: 'Aylık',
    description: 'Sürekli açık kaynak geliştirme yapan ve öncelikli erişim isteyenler için.',
    features: [
      'Git+ Özel Rozeti',
      'Gelişmiş GitHub Depo Senkronizasyonu',
      'Özel Proje Vitrini Oluşturma',
      'Topluluk Kurma & Yönetme Yetkisi'
    ],
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
    features: [
      'Code4Ever Yetkilisi Rozeti',
      'Tüm Pro & Git+ Özellikleri',
      'Onaylı Topluluk Rozeti Tanımlama',
      'Öncelikli 7/24 Destek Hattı'
    ],
    badgeId: 'c4e_admin',
    badgeLabel: 'Code4Ever Yetkilisi',
    badgeColor: '#a855f7',
    badgeIcon: 'shield',
    isActive: true
  }
];

export function loadStoredSubscriptionPlans(): SubscriptionPlan[] {
  const data = localStorage.getItem(SUBSCRIPTIONS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_SUBSCRIPTION_PLANS;
    }
  }
  return DEFAULT_SUBSCRIPTION_PLANS;
}

export function subscribeToSubscriptionPlans(onUpdate: (plans: SubscriptionPlan[]) => void): () => void {
  const docRef = doc(db, 'settings', 'subscriptions');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.plans)) {
          localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(data.plans));
          onUpdate(data.plans);
          return;
        }
      }
      onUpdate(loadStoredSubscriptionPlans());
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/subscriptions');
      onUpdate(loadStoredSubscriptionPlans());
    }
  );
}

export async function saveSubscriptionPlansInFirestore(plans: SubscriptionPlan[]): Promise<void> {
  localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(plans));
  try {
    const cleanPlans = sanitizeForFirestore(plans);
    await setDoc(doc(db, 'settings', 'subscriptions'), { plans: cleanPlans }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/subscriptions');
  }
}

// ---------------------- BADGE DEFINITIONS CONFIG ----------------------
const BADGES_CONFIG_KEY = 'c4e_badge_definitions';

export const DEFAULT_BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'c4e_dev',
    label: 'Code4Ever Developer',
    description: 'Code4Ever platformunun geliştirilmesine ve kodlanmasına katkıda bulunan yazılımcı geliştirici rozeti.',
    color: '#ef4444',
    icon: 'code',
    weight: 10,
    isDefault: true
  },
  {
    id: 'c4e_admin',
    label: 'Code4Ever Yetkilisi',
    description: 'Code4Ever yönetim ve topluluk moderasyon ekibine verilen resmi yetkili unvan rozeti.',
    color: '#a855f7',
    icon: 'shield',
    weight: 9,
    isDefault: true
  },
  {
    id: 'git_plus',
    label: 'Git+',
    description: 'Code4Ever Projesine üyelik veya abonelik yolu ile destek veren kullanıcılara verilen destekçi rozetidir.',
    color: '#f97316',
    icon: 'git',
    weight: 8,
    isDefault: true
  },
  {
    id: 'verified_dev',
    label: 'Doğrulanmış Geliştirici',
    description: 'Kimliği ve geliştirici profili resmi olarak doğrulanmış üyelere verilen onay rozeti.',
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
    weight: 5,
    isDefault: true
  },
  {
    id: 'normal_user',
    label: 'Normal Kullanıcı',
    description: 'Code4Ever topluluğunun kayıtlı aktif üye rozeti.',
    color: '#71717a',
    icon: 'star',
    weight: 1,
    isDefault: true
  }
];

export function loadStoredBadgeDefinitions(): BadgeDefinition[] {
  const data = localStorage.getItem(BADGES_CONFIG_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_BADGE_DEFINITIONS;
    }
  }
  return DEFAULT_BADGE_DEFINITIONS;
}

export function subscribeToBadgeDefinitions(onUpdate: (badges: BadgeDefinition[]) => void): () => void {
  const docRef = doc(db, 'settings', 'badges');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.badges) && data.badges.length > 0) {
          localStorage.setItem(BADGES_CONFIG_KEY, JSON.stringify(data.badges));
          onUpdate(data.badges);
          return;
        }
      }
      onUpdate(loadStoredBadgeDefinitions());
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/badges');
      onUpdate(loadStoredBadgeDefinitions());
    }
  );
}

export async function saveBadgeDefinitionsInFirestore(badges: BadgeDefinition[]): Promise<void> {
  localStorage.setItem(BADGES_CONFIG_KEY, JSON.stringify(badges));
  try {
    const cleanBadges = sanitizeForFirestore(badges);
    await setDoc(doc(db, 'settings', 'badges'), { badges: cleanBadges }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/badges');
  }
}

// ---------------------- PLATFORM / BRANDING SETTINGS ----------------------
const PLATFORM_SETTINGS_KEY = 'c4e_platform_settings';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  brandTitle: 'Code4Ever Platform',
  brandDomain: 'code4ever.ai.studio',
  brandDescription: 'Açık Kaynak Geliştirici Topluluğu & Kod Paylaşım Ağı',
  brandSlogan: 'Kodla, Paylaş, Büyü'
};

export function loadStoredPlatformSettings(): PlatformSettings {
  const data = localStorage.getItem(PLATFORM_SETTINGS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_PLATFORM_SETTINGS;
    }
  }
  return DEFAULT_PLATFORM_SETTINGS;
}

export function subscribeToPlatformSettings(onUpdate: (settings: PlatformSettings) => void): () => void {
  const docRef = doc(db, 'settings', 'platform');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<PlatformSettings>;
        const merged: PlatformSettings = {
          ...DEFAULT_PLATFORM_SETTINGS,
          ...data
        };
        localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(merged));
        onUpdate(merged);
        return;
      }
      onUpdate(loadStoredPlatformSettings());
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/platform');
      onUpdate(loadStoredPlatformSettings());
    }
  );
}

export async function savePlatformSettingsInFirestore(settings: PlatformSettings): Promise<void> {
  localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(settings));
  try {
    const cleanSettings = sanitizeForFirestore(settings);
    await setDoc(doc(db, 'settings', 'platform'), cleanSettings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/platform');
  }
}


