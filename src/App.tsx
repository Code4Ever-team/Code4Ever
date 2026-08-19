import { useState, useEffect, useMemo } from 'react';
import {
  UserProfile,
  Post,
  PostComment,
  Community,
  DynamicTheme,
  NotificationItem,
  Trend,
  GitHubRepo,
  ClosedBetaSettings,
  SubscriptionPlan,
  BadgeDefinition,
  PlatformSettings,
  JobListing,
  JobApplication
} from './types';
import {
  supabase,
  getOrFormatUserProfile,
  logoutSupabase,
  loadStoredProfile,
  saveStoredProfile,
  loadStoredPosts,
  saveStoredPosts,
  subscribeToPosts,
  createPostInSupabase,
  updatePostInSupabase,
  deletePostInSupabase,
  loadStoredCommunities,
  saveStoredCommunities,
  subscribeToCommunities,
  createCommunityInSupabase,
  updateCommunityInSupabase,
  deleteCommunityFromSupabase,
  loadLanguage,
  saveLanguage,
  saveGitHubToken,
  subscribeToAllUsers,
  updateUserProfileInSupabase,
  deleteUserFromSupabase,
  loadStoredBetaSettings,
  saveClosedBetaSettings,
  loadStoredSubscriptionPlans,
  saveSubscriptionPlans,
  loadStoredBadgeDefinitions,
  saveBadgeDefinitions,
  DEFAULT_BADGE_DEFINITIONS,
  loadStoredPlatformSettings,
  savePlatformSettings,
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_USER,
  loadStoredJobListings,
  saveStoredJobListings,
  createJobListing as createJobListingService,
  deleteJobListing as deleteJobListingService,
  submitJobApplication as submitJobApplicationService
} from './services/supabaseClient';
import {
  checkPersistentRateLimit,
  checkDuplicatePost,
  sanitizeText,
  sanitizeUrl
} from './utils/securityHelper';
import { Sidebar } from './components/Sidebar';
import { RightPanel } from './components/RightPanel';
import { FeedView } from './components/FeedView';
import { ExploreView } from './components/ExploreView';
import { NotificationsView } from './components/NotificationsView';
import { JobListingsView } from './components/JobListingsView';
import { DirectMessagesView } from './components/DirectMessagesView';
import { ProjectsView } from './components/ProjectsView';
import { CommunitiesView } from './components/CommunitiesView';
import { BookmarksView } from './components/BookmarksView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { SupportView } from './components/SupportView';
import { FileUploadWarningBanner } from './components/FileUploadWarningBanner';
import { AuthScreen } from './components/AuthScreen';
import { NewPostModal } from './components/NewPostModal';
import { UserProfileModal } from './components/UserProfileModal';
import { EveryChatView } from './components/EveryChatView';
import { AdminView } from './components/AdminView';
import { ClosedBetaScreen } from './components/ClosedBetaScreen';
import { PWAInstallModal } from './components/PWAInstallModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { sendNativeNotification } from './utils/notificationSound';
import { Sparkles, X, AlertTriangle, Lock } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [language, setLanguage] = useState<'tr' | 'en'>(loadLanguage());
  const [user, setUser] = useState<UserProfile>(loadStoredProfile() || DEFAULT_USER);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [selectedModalUsername, setSelectedModalUsername] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>(loadStoredPosts());
  const [communities, setCommunities] = useState<Community[]>(() => {
    const raw = loadStoredCommunities();
    return raw.map((c) => ({ ...c, is_joined: false }));
  });
  const [jobListings, setJobListings] = useState<JobListing[]>(loadStoredJobListings());
  const [isNewPostOpen, setIsNewPostOpen] = useState<boolean>(false);
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState<boolean>(false);
  const [betaModalInfo, setBetaModalInfo] = useState<{ title: string; desc: string; iconType?: 'sparkles' | 'lock' } | null>(null);

  const [lastActionTimestamp, setLastActionTimestamp] = useState<number>(0);
  const [lastPostTimestamp, setLastPostTimestamp] = useState<number>(0);
  const [rateLimitToast, setRateLimitToast] = useState<string | null>(null);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [closedBetaSettings, setClosedBetaSettings] = useState<ClosedBetaSettings>(loadStoredBetaSettings());
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(loadStoredSubscriptionPlans());
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>(loadStoredBadgeDefinitions());
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(loadStoredPlatformSettings());

  const theme: DynamicTheme = {
    primaryHue: 260,
    dominantColor: 'oklch(0.13 0.005 260)',
    accentColor: '#e4e4e7',
    glowColor: 'oklch(0.6 0.01 260 / 12%)',
    glassBorder: 'oklch(0.28 0.007 260)',
    cardBg: 'oklch(0.17 0.006 260)',
    textShade: 'oklch(0.97 0.002 260)'
  };

  const dynamicTrends: Trend[] = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    posts.forEach((p) => {
      const matches = p.content?.match(/#[a-zA-Z0-9_\u00C0-\u024F]+/g);
      if (matches) {
        matches.forEach((tag) => {
          const lower = tag.toLowerCase();
          tagCounts[lower] = (tagCounts[lower] || 0) + 1;
        });
      }
    });

    const list = Object.entries(tagCounts)
      .map(([tag, count], idx) => ({
        id: `trend_${idx}_${tag}`,
        tag,
        topic: tag,
        category: language === 'tr' ? 'Hashtag Trendi' : 'Hashtag Trend',
        posts_count: count
      }))
      .sort((a, b) => b.posts_count - a.posts_count);

    return list;
  }, [posts, language]);

  const parseHashParams = () => {
    if (window.location.hash.includes('access_token')) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      const providerToken = hashParams.get('provider_token') || hashParams.get('access_token');
      if (providerToken) {
        saveGitHubToken(providerToken);
      }
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const checkUrlRoute = (currentUser?: UserProfile) => {
    const path = window.location.pathname;
    if (path && path.length > 1) {
      const match = path.match(/^\/?@?([a-zA-Z0-9_]+)$/);
      if (match) {
        const routeUser = match[1].toLowerCase();
        if (routeUser === 'admin') {
          setActiveTab('admin');
          return;
        }
        if (routeUser === 'abonelik' || routeUser === 'subscriptions') {
          setActiveTab('subscriptions');
          return;
        }
        const systemTabs = ['feed', 'explore', 'notifications', 'messages', 'everychat', 'projects', 'communities', 'bookmarks', 'settings', 'profile', 'admin', 'abonelik', 'subscriptions'];
        if (!systemTabs.includes(routeUser)) {
          const activeUser = currentUser || user;
          if (activeUser.username && activeUser.username.toLowerCase() === routeUser) {
            setViewingUser(null);
            setActiveTab('profile');
          } else {
            setSelectedModalUsername(routeUser);
          }
        }
      }
    }
  };

  useEffect(() => {
    parseHashParams();
    checkUrlRoute();

    const handlePopState = () => checkUrlRoute();
    window.addEventListener('popstate', handlePopState);

    let authSubscription: { unsubscribe: () => void } | null = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const authenticatedUser = await getOrFormatUserProfile(session.user);
          setUser(authenticatedUser);
          saveStoredProfile(authenticatedUser);
          setIsAuthenticated(true);
          checkUrlRoute(authenticatedUser);
        } else {
          const stored = loadStoredProfile();
          if (stored && stored.username) {
            setUser(stored);
            setIsAuthenticated(true);
            checkUrlRoute(stored);
          } else {
            setIsAuthenticated(false);
          }
        }
      });
      authSubscription = data.subscription;
    } else {
      const stored = loadStoredProfile();
      if (stored && stored.username) {
        setUser(stored);
        setIsAuthenticated(true);
        checkUrlRoute(stored);
      } else {
        setIsAuthenticated(false);
      }
    }

    const unsubscribePosts = subscribeToPosts((realtimePosts) => {
      setPosts(realtimePosts);
    });

    const unsubscribeCommunities = subscribeToCommunities((realtimeCommunities) => {
      setCommunities(realtimeCommunities);
    });

    const unsubscribeUsers = subscribeToAllUsers((realtimeUsers) => {
      setAllUsers(realtimeUsers);
      const currentStored = loadStoredProfile();
      if (currentStored && currentStored.id) {
        const foundSelf = realtimeUsers.find((u) => u.id === currentStored.id);
        if (foundSelf) {
          setUser((prev) => ({ ...prev, ...foundSelf }));
        }
      }
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (authSubscription) authSubscription.unsubscribe();
      unsubscribePosts();
      unsubscribeCommunities();
      unsubscribeUsers();
    };
  }, []);

  const handleLogout = async () => {
    await logoutSupabase();
    setIsAuthenticated(false);
  };

  const handleChangeLanguage = (newLang: 'tr' | 'en') => {
    setLanguage(newLang);
    saveLanguage(newLang);
  };

  const triggerNotification = (notif: NotificationItem) => {
    setNotifications((prev) => [notif, ...prev]);
    const sender = notif.actor?.display_name || notif.actor?.username || 'Code4Ever';
    sendNativeNotification({
      title: `Code4Ever • @${sender}`,
      body: notif.content,
      icon: notif.actor?.avatar_url || '/logo.png',
      playSound: true,
      vibrate: true
    });
  };

  const handleUpdateProfile = (updated: Partial<UserProfile> | UserProfile) => {
    const merged = { ...user, ...updated };
    setUser(merged);
    saveStoredProfile(merged);
    if (merged.id) {
      updateUserProfileInSupabase(merged.id, merged);
    }
  };

  const handleSelectUser = (targetUsername: string) => {
    setSelectedModalUsername(targetUsername);
  };

  const handleSelectHashtag = (tag: string) => {
    const formatted = tag.startsWith('#') ? tag : `#${tag}`;
    setSelectedHashtag(formatted);
    setActiveTab('feed');
  };

  const handleLikePost = (id: string) => {
    const target = posts.find((p) => p.id === id);
    if (!target) return;
    const currentUsername = (user.username || user.id || '').toLowerCase();
    const currentLikedBy = (target.liked_by || []).map((u) => u.toLowerCase());
    const isLiked = currentLikedBy.includes(currentUsername) || Boolean(target.is_liked);

    let updatedLikedBy: string[];
    if (isLiked) {
      updatedLikedBy = (target.liked_by || []).filter((u) => u.toLowerCase() !== currentUsername);
    } else {
      updatedLikedBy = [...(target.liked_by || []), user.username || user.id];
    }
    const nextIsLiked = !isLiked;
    const updatedLikesCount = updatedLikedBy.length > 0 ? updatedLikedBy.length : (nextIsLiked ? Math.max(1, (target.likes_count || 0) + 1) : Math.max(0, (target.likes_count || 0) - 1));

    const updated = posts.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          is_liked: nextIsLiked,
          liked_by: updatedLikedBy,
          likes_count: updatedLikesCount
        };
      }
      return p;
    });
    setPosts(updated);
    saveStoredPosts(updated);
    updatePostInSupabase(id, {
      is_liked: nextIsLiked,
      liked_by: updatedLikedBy,
      likes_count: updatedLikesCount
    });
  };

  const handleRepostPost = (id: string) => {
    const target = posts.find((p) => p.id === id);
    if (!target) return;
    const currentUsername = (user.username || user.id || '').toLowerCase();
    const currentRepostedBy = (target.reposted_by || []).map((u) => u.toLowerCase());
    const isReposted = currentRepostedBy.includes(currentUsername) || Boolean(target.is_reposted);

    let updatedRepostedBy: string[];
    if (isReposted) {
      updatedRepostedBy = (target.reposted_by || []).filter((u) => u.toLowerCase() !== currentUsername);
    } else {
      updatedRepostedBy = [...(target.reposted_by || []), user.username || user.id];
    }
    const nextIsReposted = !isReposted;
    const updatedRepostsCount = updatedRepostedBy.length > 0 ? updatedRepostedBy.length : (nextIsReposted ? Math.max(1, (target.reposts_count || 0) + 1) : Math.max(0, (target.reposts_count || 0) - 1));

    const updated = posts.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          is_reposted: nextIsReposted,
          reposted_by: updatedRepostedBy,
          reposts_count: updatedRepostsCount
        };
      }
      return p;
    });
    setPosts(updated);
    saveStoredPosts(updated);
    updatePostInSupabase(id, {
      is_reposted: nextIsReposted,
      reposted_by: updatedRepostedBy,
      reposts_count: updatedRepostsCount
    });
  };

  const handleBookmarkPost = (id: string) => {
    const target = posts.find((p) => p.id === id);
    if (!target) return;
    const currentUsername = (user.username || user.id || '').toLowerCase();
    const currentBookmarkedBy = (target.bookmarked_by || []).map((u) => u.toLowerCase());
    const isBookmarked =
      currentBookmarkedBy.includes(currentUsername) ||
      Boolean(target.is_bookmarked) ||
      Boolean(user.saved_post_ids?.includes(id));

    let updatedBookmarkedBy: string[];
    if (isBookmarked) {
      updatedBookmarkedBy = (target.bookmarked_by || []).filter((u) => u.toLowerCase() !== currentUsername);
    } else {
      updatedBookmarkedBy = [...(target.bookmarked_by || []), user.username || user.id];
    }
    const nextIsBookmarked = !isBookmarked;

    const updated = posts.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          is_bookmarked: nextIsBookmarked,
          bookmarked_by: updatedBookmarkedBy
        };
      }
      return p;
    });
    setPosts(updated);
    saveStoredPosts(updated);
    updatePostInSupabase(id, {
      is_bookmarked: nextIsBookmarked,
      bookmarked_by: updatedBookmarkedBy
    });

    const currentSavedIds = user.saved_post_ids || [];
    const newSavedIds = nextIsBookmarked
      ? (currentSavedIds.includes(id) ? currentSavedIds : [...currentSavedIds, id])
      : currentSavedIds.filter((pid) => pid !== id);
    const updatedUser = { ...user, saved_post_ids: newSavedIds };
    setUser(updatedUser);
    saveStoredProfile(updatedUser);
    if (user.id) {
      updateUserProfileInSupabase(user.id, { saved_post_ids: newSavedIds });
    }
  };

  const handleDeletePost = (id: string) => {
    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    saveStoredPosts(updated);
    deletePostInSupabase(id);
  };

  const checkRateLimit = (): boolean => {
    const rateCheck = checkPersistentRateLimit('general_action', 3);
    if (!rateCheck.allowed) {
      const msg =
        language === 'tr'
          ? `Rate Limit: Lütfen biraz yavaşlayın! ${rateCheck.waitRemainingSeconds} saniye bekleyin.`
          : `Rate Limit: Please slow down! Wait ${rateCheck.waitRemainingSeconds} second(s).`;
      setRateLimitToast(msg);
      setTimeout(() => setRateLimitToast(null), 2500);
      return false;
    }
    return true;
  };

  const checkPostRateLimit = (): boolean => {
    const rateCheck = checkPersistentRateLimit('post_create', 10);
    if (!rateCheck.allowed) {
      const msg =
        language === 'tr'
          ? `⚠️ Rate Limit: Lütfen ${rateCheck.waitRemainingSeconds} saniye bekleyin! Çok hızlı gönderi paylaşıyorsunuz.`
          : `⚠️ Rate Limit: Please wait ${rateCheck.waitRemainingSeconds}s! You are posting too fast.`;
      setRateLimitToast(msg);
      setTimeout(() => setRateLimitToast(null), 3000);
      return false;
    }
    return true;
  };

  const handleCreatePost = async (
    content: string,
    codeSnippet?: { title: string; language: string; code: string },
    selectedRepo?: GitHubRepo,
    mediaUrl?: string,
    mediaType?: 'image' | 'video',
    communityId?: string,
    communityName?: string,
    communityHandle?: string
  ): Promise<boolean> => {
    if (!checkPostRateLimit()) return false;

    // Check anti-spam duplicate post
    if (checkDuplicatePost(content)) {
      const msg =
        language === 'tr'
          ? '⚠️ Spam Koruması: Aynı gönderiyi tekrar paylaştınız! Lütfen farklı bir içerik girin.'
          : '⚠️ Anti-Spam: Duplicate post detected! Please share unique content.';
      setRateLimitToast(msg);
      setTimeout(() => setRateLimitToast(null), 3500);
      return false;
    }

    const sanitizedContent = sanitizeText(content, 4000);
    const sanitizedMediaUrl = mediaUrl ? (mediaUrl.startsWith('data:') ? mediaUrl : sanitizeUrl(mediaUrl)) : undefined;

    const sanitizedSnippet = codeSnippet
      ? {
          title: sanitizeText(codeSnippet.title, 80) || 'Snippet',
          language: sanitizeText(codeSnippet.language, 40) || 'Code',
          code: sanitizeText(codeSnippet.code, 15000)
        }
      : undefined;

    const newPost: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      author: {
        username: user.username,
        display_name: user.display_name,
        avatar_url: sanitizeUrl(user.avatar_url) || user.avatar_url
      },
      time_ago: 'Az önce',
      content: sanitizedContent,
      media_url: sanitizedMediaUrl,
      media_type: mediaType,
      code_snippet: sanitizedSnippet,
      community_id: communityId,
      community_name: communityName ? sanitizeText(communityName, 50) : undefined,
      community_handle: communityHandle ? sanitizeText(communityHandle, 50) : undefined,
      project_card: selectedRepo
        ? {
            id: String(selectedRepo.id),
            title: sanitizeText(selectedRepo.name, 60),
            description: sanitizeText(selectedRepo.description, 200) || '',
            language: sanitizeText(selectedRepo.language, 30) || 'Code',
            stars: Number(selectedRepo.stargazers_count) || 0,
            forks: Number(selectedRepo.forks_count) || 0
          }
        : undefined,
      comments: [],
      comments_count: 0,
      reposts_count: 0,
      likes_count: 0,
      is_liked: false,
      is_reposted: false,
      is_bookmarked: false,
      created_at: new Date().toISOString()
    };
    const updated = [newPost, ...posts];
    setPosts(updated);
    saveStoredPosts(updated);
    try {
      await createPostInSupabase(newPost);
    } catch (err) {
      console.error("Supabase error saving post:", err);
    }
    return true;
  };

  const handleAddComment = (postId: string, commentText: string) => {
    if (!checkRateLimit()) return;

    const target = posts.find((p) => p.id === postId);
    if (!target) return;

    const sanitizedComment = sanitizeText(commentText, 1000);
    if (!sanitizedComment) return;

    const newComment: PostComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      author: {
        username: user.username,
        display_name: user.display_name,
        avatar_url: sanitizeUrl(user.avatar_url) || user.avatar_url
      },
      content: sanitizedComment,
      created_at: new Date().toISOString()
    };

    const existingComments = target.comments || [];
    const updatedComments = [...existingComments, newComment];
    const newCommentsCount = updatedComments.length;

    const updated = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          comments: updatedComments,
          comments_count: newCommentsCount
        };
      }
      return p;
    });
    setPosts(updated);
    saveStoredPosts(updated);
    updatePostInSupabase(postId, {
      comments: updatedComments,
      comments_count: newCommentsCount
    });

    // Notify author if commenter is not post author
    if (target.author.username !== user.username) {
      const authorNotif: NotificationItem = {
        id: `notif_${Date.now()}`,
        type: 'comment',
        actor: {
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url
        },
        content: `gönderinize yorum yaptı: "${sanitizedComment.substring(0, 60)}"`,
        time_ago: 'Az önce',
        is_read: false
      };
      triggerNotification(authorNotif);
    }
  };

  const handleCreateJobListing = async (newListing: JobListing) => {
    const updated = [newListing, ...jobListings];
    setJobListings(updated);
    await createJobListingService(newListing);
  };

  const handleDeleteJobListing = async (jobId: string) => {
    const updated = jobListings.filter((j) => j.id !== jobId);
    setJobListings(updated);
    await deleteJobListingService(jobId);
  };

  const handleSubmitJobApplication = async (application: JobApplication) => {
    const success = await submitJobApplicationService(application, (notif) => {
      triggerNotification(notif);
    });
    if (success) {
      setJobListings(loadStoredJobListings());
    }
  };

  const handleToggleJoinCommunity = (id: string) => {
    const target = communities.find((c) => c.id === id);
    if (!target) return;
    const joined = !target.is_joined;
    const newMembersCount = joined ? target.members_count + 1 : Math.max(0, target.members_count - 1);

    const updated = communities.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          is_joined: joined,
          members_count: newMembersCount
        };
      }
      return c;
    });
    setCommunities(updated);
    saveStoredCommunities(updated);
    updateCommunityInSupabase(id, { is_joined: joined, members_count: newMembersCount });
  };

  const handleCreateCommunity = (newComm: { name: string; handle: string; description?: string; avatar_url: string; banner_url?: string }) => {
    const cleanHandle = newComm.handle.replace(/^@/, '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    const created: Community = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: sanitizeText(newComm.name, 60),
      handle: cleanHandle,
      description: newComm.description ? sanitizeText(newComm.description, 250) : undefined,
      avatar_url: sanitizeUrl(newComm.avatar_url) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      banner_url: sanitizeUrl(newComm.banner_url) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      members_count: 1,
      is_joined: true,
      created_by: user.id,
      creator_username: user.username,
      created_at: new Date().toISOString()
    };
    const updated = [created, ...communities];
    setCommunities(updated);
    saveStoredCommunities(updated);
    createCommunityInSupabase(created);
  };

  const handleUpdateCommunity = (updatedComm: Community) => {
    const updated = communities.map((c) => (c.id === updatedComm.id ? updatedComm : c));
    setCommunities(updated);
    saveStoredCommunities(updated);
    updateCommunityInSupabase(updatedComm.id, updatedComm);
  };

  const handleDeleteCommunity = async (commId: string) => {
    const updated = communities.filter((c) => c.id !== commId);
    setCommunities(updated);
    saveStoredCommunities(updated);
    await deleteCommunityFromSupabase(commId);
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;

  const handleToggleClosedBeta = (isActive: boolean) => {
    const newSettings: ClosedBetaSettings = {
      isActive,
      updatedAt: new Date().toISOString(),
      updatedBy: 'nylithra'
    };
    setClosedBetaSettings(newSettings);
    saveClosedBetaSettings(newSettings);
  };

  const handleAdminUpdateUser = (userId: string, updatedFields: Partial<UserProfile>) => {
    updateUserProfileInSupabase(userId, updatedFields);
    if (user.id === userId) {
      const updatedUser = { ...user, ...updatedFields };
      setUser(updatedUser);
      saveStoredProfile(updatedUser);
    }
  };

  const handleUpdateContact = (contact: string) => {
    const updatedUser: UserProfile = {
      ...user,
      betaContact: contact,
      betaStatus: user.betaStatus || 'pending'
    };
    setUser(updatedUser);
    saveStoredProfile(updatedUser);
    if (user.id) {
      updateUserProfileInSupabase(user.id, {
        betaContact: contact,
        betaStatus: user.betaStatus || 'pending'
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <AuthScreen
        language={language}
        onChangeLanguage={handleChangeLanguage}
        isClosedBetaActive={closedBetaSettings.isActive}
      />
    );
  }

  const isNylithra = user?.username?.toLowerCase() === 'nylithra';

  const isBanned = !isNylithra && user.isBanned;
  const isSuspended =
    !isNylithra &&
    user.suspendedUntil &&
    new Date(user.suspendedUntil) > new Date();

  if (isBanned || isSuspended) {
    return (
      <div className="min-h-screen w-full bg-[#09090b] text-white flex items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#0c0c0e] border border-red-500/30 space-y-4 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-extrabold text-white">
            {isBanned ? 'Hesabınız Yasaklandı (BAN)' : 'Hesabınız Askıya Alındı'}
          </h2>

          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            {isBanned
              ? (user.banReason || 'Code4Ever topluluk kurallarına aykırı davranışlar nedeniyle hesabınız kalıcı olarak kapatılmıştır.')
              : `Hesabınız ${new Date(user.suspendedUntil!).toLocaleDateString('tr-TR')} tarihine kadar geçici olarak askıya alınmıştır.`}
          </p>

          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 transition-colors shadow-lg"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  const isClosedBetaBlocked =
    closedBetaSettings.isActive &&
    !isNylithra &&
    user.betaStatus !== 'approved';

  if (isClosedBetaBlocked) {
    return (
      <ClosedBetaScreen
        user={user}
        language={language}
        onUpdateContact={handleUpdateContact}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-app-background text-app-foreground flex justify-center font-display selection:bg-blue-500 selection:text-white relative">
      {rateLimitToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black font-bold text-xs px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-amber-300 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-black flex-shrink-0" />
          <span>{rateLimitToast}</span>
        </div>
      )}

      <div className="w-full flex flex-col md:flex-row relative min-h-screen min-w-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'profile') setViewingUser(null);
            setActiveTab(tab);
          }}
          user={user}
          theme={theme}
          language={language}
          unreadCount={unreadNotificationsCount}
          onOpenNewPost={() => setIsNewPostOpen(true)}
          onLogout={handleLogout}
          onChangeLanguage={handleChangeLanguage}
          onOpenInstallPWA={() => setIsPWAInstallModalOpen(true)}
          onOpenBetaModal={(tabType) => {
            if (tabType === 'everychat') {
              setBetaModalInfo({
                title: language === 'tr' ? 'EveryChat Erişimi Kısıtlı' : 'EveryChat Restricted',
                desc: language === 'tr'
                  ? 'EveryChat yapay zeka modülü şu anda beta aşamasındadır. Çok yakında tüm kullanıcılarımıza sunulacaktır.'
                  : 'EveryChat AI model is currently in beta. It will be available for all users soon.',
                iconType: 'lock'
              });
            } else {
              setBetaModalInfo({
                title: language === 'tr' ? 'Mesajlar BETA Aşamasında' : 'Messages in BETA',
                desc: language === 'tr'
                  ? 'Mesajlaşma sistemi şu anda aktif geliştirme aşamasındadır. Çok yakında kullanıma sunulacaktır.'
                  : 'Direct Messaging is currently in active development (BETA). It will be available very soon.',
                iconType: 'sparkles'
              });
            }
          }}
        />

        <main className="flex-1 flex min-h-screen w-full pt-[52px] md:pt-0 pb-16 md:pb-0 min-w-0">
          {activeTab === 'feed' && (
            <FeedView
              posts={posts}
              user={user}
              allUsers={allUsers}
              communities={communities}
              language={language}
              selectedHashtag={selectedHashtag}
              onClearHashtag={() => setSelectedHashtag(null)}
              onSelectHashtag={handleSelectHashtag}
              onLikePost={handleLikePost}
              onRepostPost={handleRepostPost}
              onBookmarkPost={handleBookmarkPost}
              onDeletePost={handleDeletePost}
              onCreatePost={handleCreatePost}
              onAddComment={handleAddComment}
              onSelectUser={handleSelectUser}
            />
          )}

          {activeTab === 'explore' && (
            <ExploreView
              posts={posts}
              communities={communities}
              trends={dynamicTrends}
              language={language}
              onLikePost={handleLikePost}
              onSelectCommunity={() => setActiveTab('communities')}
            />
          )}

          {activeTab === 'jobs' && (
            <JobListingsView
              currentUser={user}
              language={language}
              jobListings={jobListings}
              onCreateListing={handleCreateJobListing}
              onDeleteListing={handleDeleteJobListing}
              onSubmitApplication={handleSubmitJobApplication}
              onSelectUser={handleSelectUser}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              language={language}
              onMarkAllAsRead={() => setNotifications(notifications.map((n) => ({ ...n, is_read: true })))}
              onClearNotifications={() => setNotifications([])}
              onSelectTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'messages' && (
            <DirectMessagesView
              user={user}
              language={language}
            />
          )}

          {activeTab === 'everychat' && (
            <EveryChatView
              user={user}
              language={language}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              user={user}
              language={language}
            />
          )}

          {activeTab === 'communities' && (
            <CommunitiesView
              communities={communities}
              user={user}
              allUsers={allUsers}
              language={language}
              onToggleJoin={handleToggleJoinCommunity}
              onCreateCommunity={handleCreateCommunity}
              onUpdateCommunity={handleUpdateCommunity}
              onDeleteCommunity={handleDeleteCommunity}
            />
          )}

          {activeTab === 'bookmarks' && (
            <BookmarksView
              posts={posts}
              user={user}
              language={language}
              onLikePost={handleLikePost}
              onRepostPost={handleRepostPost}
              onDeletePost={handleDeletePost}
              onRemoveBookmark={handleBookmarkPost}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              user={viewingUser || user}
              currentUser={user}
              allUsers={allUsers}
              posts={posts}
              theme={theme}
              language={language}
              communities={communities}
              onUpdateProfile={handleUpdateProfile}
              onSelectCommunity={(comm) => setSelectedModalUsername(comm.handle)}
              onLikePost={handleLikePost}
              onRepostPost={handleRepostPost}
              onBookmarkPost={handleBookmarkPost}
              onDeletePost={handleDeletePost}
              onAddComment={handleAddComment}
              onSelectUser={(uname) => setSelectedModalUsername(uname)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              user={user}
              language={language}
              onUpdateProfile={handleUpdateProfile}
              onChangeLanguage={handleChangeLanguage}
              onLogout={handleLogout}
              onOpenInstallPWA={() => setIsPWAInstallModalOpen(true)}
            />
          )}

          {(activeTab === 'support' || activeTab === 'subscriptions') && (
            <SupportView
              user={user}
              language={language}
              onUpdateUser={handleUpdateProfile}
            />
          )}

          {activeTab === 'admin' && (
            <AdminView
              currentUser={user}
              allUsers={allUsers}
              closedBetaSettings={closedBetaSettings}
              subscriptionPlans={subscriptionPlans}
              badgeDefinitions={badgeDefinitions}
              platformSettings={platformSettings}
              language={language}
              onToggleClosedBeta={handleToggleClosedBeta}
              onUpdateUser={handleAdminUpdateUser}
              onDeleteUser={async (userId) => {
                await deleteUserFromSupabase(userId);
                setAllUsers((prev) => prev.filter((u) => u.id !== userId));
              }}
              onSaveSubscriptionPlans={(plans) => {
                setSubscriptionPlans(plans);
                saveSubscriptionPlans(plans);
              }}
              onSaveBadgeDefinitions={(badges) => {
                setBadgeDefinitions(badges);
                saveBadgeDefinitions(badges);
              }}
              onSavePlatformSettings={(settings) => {
                setPlatformSettings(settings);
                savePlatformSettings(settings);
              }}
            />
          )}

          <RightPanel
            communities={communities}
            trends={dynamicTrends}
            platformSettings={platformSettings}
            language={language}
            onToggleJoinCommunity={handleToggleJoinCommunity}
            onSelectTrend={(trend) => handleSelectHashtag(trend.topic || trend.tag)}
          />
        </main>
      </div>

      <FileUploadWarningBanner onOpenSupportTab={() => setActiveTab('support')} />

      <NewPostModal
        isOpen={isNewPostOpen}
        user={user}
        communities={communities}
        language={language}
        onClose={() => setIsNewPostOpen(false)}
        onCreatePost={handleCreatePost}
      />

      <UserProfileModal
        isOpen={!!selectedModalUsername}
        username={selectedModalUsername}
        onClose={() => setSelectedModalUsername(null)}
        currentUser={user}
        communities={communities}
        language={language}
        onToggleJoinCommunity={handleToggleJoinCommunity}
        onNavigateToFullProfile={(profile) => {
          setViewingUser(profile);
          setActiveTab('profile');
        }}
      />

      <PWAInstallBanner
        onOpenInstallModal={() => setIsPWAInstallModalOpen(true)}
        language={language}
      />

      <PWAInstallModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
        language={language}
      />

      {betaModalInfo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#121215] border border-zinc-800 rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl relative text-white">
            <button
              onClick={() => setBetaModalInfo(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
              {betaModalInfo.iconType === 'lock' ? (
                <Lock className="w-6 h-6 text-amber-400" />
              ) : (
                <Sparkles className="w-6 h-6 text-blue-400" />
              )}
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {betaModalInfo.title}
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
              {betaModalInfo.desc}
            </p>
            <button
              onClick={() => setBetaModalInfo(null)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-lg shadow-blue-600/20"
            >
              {language === 'tr' ? 'Anladım' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

