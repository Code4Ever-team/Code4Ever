import { useState, useEffect, useMemo, useRef } from 'react';
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
  loadStoredAllUsers,
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
  subscribeToJobListings,
  createJobListing as createJobListingService,
  deleteJobListing as deleteJobListingService,
  submitJobApplication as submitJobApplicationService,
  subscribeToUserIncomingMessages,
  loadStoredNotifications,
  saveStoredNotifications,
  subscribeToUserNotifications,
  fetchNotificationsFromSupabase,
  markNotificationAsReadInSupabase,
  markAllNotificationsAsReadInSupabase,
  markJobApplicationAsAnsweredOrRead,
  markNotificationsFromUserAsRead,
  clearAllNotificationsInSupabase
} from './services/supabaseClient';
import { decryptE2EEMessage } from './utils/e2eeHelper';
import {
  checkPersistentRateLimit,
  checkDuplicatePost,
  sanitizeText,
  sanitizeCode,
  sanitizeUrl,
  runSecurityPenetrationTest,
  verifyAdminAccess
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
import { ReportErrorModal } from './components/ReportErrorModal';
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
  const [isReportErrorOpen, setIsReportErrorOpen] = useState<boolean>(false);
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState<boolean>(false);
  const [betaModalInfo, setBetaModalInfo] = useState<{ title: string; desc: string; iconType?: 'sparkles' | 'lock' } | null>(null);

  const [lastActionTimestamp, setLastActionTimestamp] = useState<number>(0);
  const [lastPostTimestamp, setLastPostTimestamp] = useState<number>(0);
  const [rateLimitToast, setRateLimitToast] = useState<string | null>(null);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadStoredNotifications());
  const [directChatTargetUser, setDirectChatTargetUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => loadStoredAllUsers());
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

  // Anti-spam concurrency mutex for community toggle actions
  const togglingCommunityIds = useRef<Set<string>>(new Set());

  // Dynamically resolve joined status and clean member counts based on current user's profile
  const displayCommunities = useMemo(() => {
    const userJoinedSet = new Set(user?.joined_communities || []);
    return communities.map((c) => {
      const isUserJoined = userJoinedSet.has(c.id);
      const rawCount = Number(c.members_count);
      const safeCount = Number.isFinite(rawCount) && rawCount >= 0 ? rawCount : (isUserJoined ? 1 : 0);
      return {
        ...c,
        is_joined: isUserJoined,
        members_count: safeCount
      };
    });
  }, [communities, user?.joined_communities]);

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
      // 1. Check if community route: /c/@handle or /c/handle
      const commMatch = path.match(/^\/c\/?@?([a-zA-Z0-9_\-]+)$/i);
      if (commMatch) {
        const commHandle = commMatch[1].toLowerCase();
        setSelectedModalUsername(`/c/@${commHandle}`);
        return;
      }

      // 2. Check tab or user profile route
      const match = path.match(/^\/?@?([a-zA-Z0-9_\-]+)$/);
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
        const systemTabs = ['feed', 'explore', 'notifications', 'messages', 'everychat', 'projects', 'communities', 'bookmarks', 'settings', 'profile', 'admin', 'abonelik', 'subscriptions', 'support', 'jobs'];
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
          const selfPinned: GitHubRepo[] = (foundSelf.pinned_repos && Array.isArray(foundSelf.pinned_repos) && foundSelf.pinned_repos.length > 0)
            ? foundSelf.pinned_repos
            : (foundSelf.custom_fields?.pinned_repos && Array.isArray(foundSelf.custom_fields.pinned_repos) && foundSelf.custom_fields.pinned_repos.length > 0)
            ? foundSelf.custom_fields.pinned_repos
            : (currentStored.pinned_repos || []);

          // CRUCIAL BADGE PROTECTION: NEVER wipe out active badges with an empty array from a remote sync event!
          const mergedBadges = (foundSelf.badges && Array.isArray(foundSelf.badges) && foundSelf.badges.length > 0)
            ? foundSelf.badges
            : (foundSelf.custom_fields?.badges && Array.isArray(foundSelf.custom_fields.badges) && foundSelf.custom_fields.badges.length > 0)
            ? foundSelf.custom_fields.badges
            : (currentStored.badges && Array.isArray(currentStored.badges) && currentStored.badges.length > 0)
            ? currentStored.badges
            : [];

          setUser((prev) => {
            const finalBadges = mergedBadges.length > 0 ? mergedBadges : (prev.badges || []);
            const updated = {
              ...prev,
              ...foundSelf,
              badges: finalBadges,
              website: foundSelf.website || foundSelf.custom_fields?.website || prev.website || currentStored.website,
              pinned_repos: selfPinned,
              subscription: foundSelf.subscription?.isActive ? foundSelf.subscription : (prev.subscription?.isActive ? prev.subscription : currentStored.subscription)
            };
            saveStoredProfile(updated);
            return updated;
          });
        }
      }
    });

    const unsubscribeJobListings = subscribeToJobListings((realtimeJobs) => {
      setJobListings(realtimeJobs);
    });

    // Run Simulated Attacker Security Audit on boot
    try {
      const auditResult = runSecurityPenetrationTest();
      console.log(`%c[Security Audit] Attacker Simulation Complete: ${auditResult.passed}/${auditResult.totalTests} tests neutralized (Status: ${auditResult.overallStatus})`, 'color: #10b981; font-weight: bold;');
    } catch (e) {
      console.warn('Security audit run warning:', e);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (authSubscription) authSubscription.unsubscribe();
      unsubscribePosts();
      unsubscribeCommunities();
      unsubscribeUsers();
      unsubscribeJobListings();
    };
  }, []);

  // Global Realtime Incoming Message Listener & Notification Engine
  useEffect(() => {
    if (!user.username) return;

    const unsubscribeMessages = subscribeToUserIncomingMessages(
      user.username,
      async (incomingMsg) => {
        // 1. Decrypt incoming message content if E2EE encrypted
        let decrypted = incomingMsg.decrypted_text || incomingMsg.content || '';
        if (decrypted.startsWith('e2ee:')) {
          try {
            decrypted = await decryptE2EEMessage(decrypted, incomingMsg.conversation_id);
          } catch {
            decrypted = language === 'tr' ? 'Yeni bir mesaj' : 'New message';
          }
        }

        // 2. Format preview content for snippets or attachments
        let bodyText = decrypted;
        if (decrypted.startsWith('[CODE_SNIPPET]')) {
          bodyText = language === 'tr' ? '💻 Sana bir kod parçası gönderdi.' : '💻 Sent you a code snippet.';
        } else if (decrypted.startsWith('[MEDIA:IMAGE]')) {
          bodyText = language === 'tr' ? '📷 Sana bir görsel gönderdi.' : '📷 Sent you an image.';
        } else if (decrypted.startsWith('[MEDIA:FILE]')) {
          bodyText = language === 'tr' ? '📎 Sana bir dosya gönderdi.' : '📎 Sent you a file.';
        }

        const senderDisplay = incomingMsg.sender_display_name || incomingMsg.sender_username;
        const notifItem: NotificationItem = {
          id: `msg_notif_${incomingMsg.id || Date.now()}`,
          type: 'message',
          recipient_id: user.username,
          actor: {
            username: incomingMsg.sender_username,
            display_name: senderDisplay,
            avatar_url: incomingMsg.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
          },
          content: bodyText,
          time_ago: language === 'tr' ? 'Şimdi' : 'Just now',
          is_read: false,
          target_id: incomingMsg.conversation_id,
          created_at: incomingMsg.created_at || new Date().toISOString()
        };

        triggerNotification(notifItem);
      }
    );

    // Global Notifications Realtime Listener (Job applications, mentions, etc.)
    const unsubscribeNotifications = subscribeToUserNotifications(
      user.username,
      (realtimeNotifs) => {
        setNotifications(realtimeNotifs);
      },
      (newNotif) => {
        const sender = newNotif.actor?.display_name || newNotif.actor?.username || 'Code4Ever';
        sendNativeNotification({
          title: `Code4Ever • @${sender}`,
          body: newNotif.content,
          icon: newNotif.actor?.avatar_url || '/logo.png',
          playSound: true,
          vibrate: true
        });
      }
    );

    return () => {
      unsubscribeMessages();
      unsubscribeNotifications();
    };
  }, [user.username, language]);

  const handleLogout = async () => {
    await logoutSupabase();
    setIsAuthenticated(false);
  };

  const handleChangeLanguage = (newLang: 'tr' | 'en') => {
    setLanguage(newLang);
    saveLanguage(newLang);
  };

  const triggerNotification = (notif: NotificationItem) => {
    setNotifications((prev) => {
      const exists = prev.some((n) => n.id === notif.id);
      if (exists) return prev;
      const updated = [notif, ...prev];
      saveStoredNotifications(updated);
      return updated;
    });

    const sender = notif.actor?.display_name || notif.actor?.username || 'Code4Ever';
    sendNativeNotification({
      title: `Code4Ever • @${sender}`,
      body: notif.content,
      icon: notif.actor?.avatar_url || '/logo.png',
      playSound: true,
      vibrate: true
    });
  };

  const handleMarkNotificationAsRead = async (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
    await markNotificationAsReadInSupabase(notifId);
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, is_read: true }));
    setNotifications(updated);
    await markAllNotificationsAsReadInSupabase(user.username);
  };

  const handleClearNotifications = async () => {
    setNotifications([]);
    await clearAllNotificationsInSupabase(user.username);
  };

  const handleStartDirectChat = async (targetUser: UserProfile) => {
    setDirectChatTargetUser(targetUser);
    setActiveTab('messages');
    setSelectedModalUsername(null);

    if (targetUser?.username) {
      setNotifications((prev) =>
        prev.map((n) =>
          (n.actor?.username || '').toLowerCase() === (targetUser.username || '').toLowerCase()
            ? { ...n, is_read: true }
            : n
        )
      );
      await markNotificationsFromUserAsRead(targetUser.username);
    }
  };

  const handleUpdateProfile = (updated: Partial<UserProfile> | UserProfile) => {
    const finalBadges = Array.isArray(updated.badges)
      ? updated.badges
      : (Array.isArray(user.badges) && user.badges.length > 0)
      ? user.badges
      : (user.custom_fields?.badges && Array.isArray(user.custom_fields.badges))
      ? user.custom_fields.badges
      : [];

    const merged: UserProfile = {
      ...user,
      ...updated,
      badges: finalBadges,
      custom_fields: {
        ...(user.custom_fields || {}),
        ...(updated.custom_fields || {}),
        badges: finalBadges
      }
    };
    setUser(merged);
    saveStoredProfile(merged);
    setAllUsers((prev) =>
      prev.map((u) => (u.id === merged.id || (u.username && merged.username && u.username.toLowerCase() === merged.username.toLowerCase()) ? { ...u, ...merged } : u))
    );
    if (merged.id) {
      updateUserProfileInSupabase(merged.id, merged);
    }
  };

  const handleSelectUser = (targetUsername: string) => {
    const clean = (targetUsername || '').replace(/^@/, '').trim().toLowerCase();
    if (!clean) return;
    if (window.location.pathname !== `/@${clean}`) {
      window.history.pushState(null, '', `/@${clean}`);
    }
    setSelectedModalUsername(clean);
  };

  const handleSelectCommunity = (commOrHandle: Community | string) => {
    const handle = typeof commOrHandle === 'string' ? commOrHandle : commOrHandle.handle;
    const clean = (handle || '').replace(/^\/?c\/?@?/, '').replace(/^@/, '').trim().toLowerCase();
    if (!clean) return;
    if (window.location.pathname !== `/c/@${clean}`) {
      window.history.pushState(null, '', `/c/@${clean}`);
    }
    setSelectedModalUsername(`/c/@${clean}`);
  };

  const handleCloseProfileModal = () => {
    setSelectedModalUsername(null);
    const tabPath = activeTab === 'feed' ? '/' : `/${activeTab}`;
    if (window.location.pathname !== tabPath) {
      window.history.pushState(null, '', tabPath);
    }
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

  const handleDeletePost = async (id: string) => {
    const targetPost = posts.find((p) => p.id === id);
    if (!targetPost) return;

    // Strict Authorization Verification
    const authorId = (targetPost.author as any)?.id;
    const isAuthor =
      (targetPost.author?.username || '').toLowerCase() === (user.username || '').toLowerCase() ||
      (Boolean(authorId && user.id && authorId === user.id));
    const isAdmin = verifyAdminAccess(user);

    if (!isAuthor && !isAdmin) {
      const msg =
        language === 'tr'
          ? 'Yetkisiz İşlem: Yalnızca kendi gönderilerinizi veya yöneticiyseniz (isAdmin) silebilirsiniz!'
          : 'Unauthorized: You can only delete your own posts unless you are an administrator!';
      setRateLimitToast(msg);
      setTimeout(() => setRateLimitToast(null), 3000);
      return;
    }

    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    saveStoredPosts(updated);
    try {
      await deletePostInSupabase(id, user);
    } catch (e) {
      console.warn('Supabase post delete sync warning:', e);
    }
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
    communityHandle?: string,
    category?: string,
    categoryName?: string
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

    const sanitizedSnippet = codeSnippet && codeSnippet.code && codeSnippet.code.trim()
      ? {
          title: sanitizeText(codeSnippet.title, 80) || 'Snippet',
          language: sanitizeText(codeSnippet.language, 40) || 'Code',
          code: sanitizeCode(codeSnippet.code, 50000)
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
      category: category || 'general',
      category_name: categoryName || 'Genel & Sohbet',
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

  const handleToggleJoinCommunity = async (id: string) => {
    if (!id) return;
    // Anti-spam debounce & in-flight lock to prevent duplicate rapid clicks
    if (togglingCommunityIds.current.has(id)) {
      return;
    }
    togglingCommunityIds.current.add(id);
    setTimeout(() => {
      togglingCommunityIds.current.delete(id);
    }, 500);

    const userJoinedSet = new Set(user.joined_communities || []);
    const isCurrentlyJoined = userJoinedSet.has(id);
    const target = communities.find((c) => c.id === id);
    if (!target) {
      togglingCommunityIds.current.delete(id);
      return;
    }

    const currentCount = Math.max(0, parseInt(String(target.members_count), 10) || 0);

    // 1. Calculate strictly deterministic transitions based on user.joined_communities
    let newJoinedCommunities: string[];
    let newMembersCount: number;

    if (isCurrentlyJoined) {
      // User leaves community -> strictly remove from list & decrement by 1 (min 0)
      newJoinedCommunities = (user.joined_communities || []).filter((cId) => cId !== id);
      newMembersCount = Math.max(0, currentCount - 1);
    } else {
      // User joins community -> strictly add to list & increment by 1
      newJoinedCommunities = Array.from(new Set([...(user.joined_communities || []), id]));
      newMembersCount = Math.max(1, currentCount + 1);
    }

    // 2. Persist updated user profile locally and to Supabase
    const updatedUser: UserProfile = {
      ...user,
      joined_communities: newJoinedCommunities
    };
    setUser(updatedUser);
    saveStoredProfile(updatedUser);
    if (user.id) {
      updateUserProfileInSupabase(user.id, {
        joined_communities: newJoinedCommunities
      });
    }

    // 3. Persist updated communities list locally
    const updatedCommunities = communities.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          is_joined: !isCurrentlyJoined,
          members_count: newMembersCount
        };
      }
      return c;
    });
    setCommunities(updatedCommunities);
    saveStoredCommunities(updatedCommunities);

    // 4. Update community in Supabase database
    try {
      await updateCommunityInSupabase(id, {
        members_count: newMembersCount
      });
    } catch (err) {
      console.warn('Supabase community count update warning:', err);
    } finally {
      setTimeout(() => {
        togglingCommunityIds.current.delete(id);
      }, 300);
    }
  };

  const handleCreateCommunity = (newComm: { name: string; handle: string; description?: string; avatar_url: string; banner_url?: string }) => {
    const cleanHandle = newComm.handle.replace(/^@/, '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    const newCommId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created: Community = {
      id: newCommId,
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

    // Also register the new community in the user's joined_communities list
    const newJoined = Array.from(new Set([...(user.joined_communities || []), newCommId]));
    const updatedUser: UserProfile = {
      ...user,
      joined_communities: newJoined
    };
    setUser(updatedUser);
    saveStoredProfile(updatedUser);
    if (user.id) {
      updateUserProfileInSupabase(user.id, {
        joined_communities: newJoined
      });
    }

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
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updatedFields } : u))
    );
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
          onOpenReportError={() => setIsReportErrorOpen(true)}
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
              communities={displayCommunities}
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
              onSelectCommunity={handleSelectCommunity}
            />
          )}

          {activeTab === 'explore' && (
            <ExploreView
              posts={posts}
              communities={displayCommunities}
              trends={dynamicTrends}
              language={language}
              onLikePost={handleLikePost}
              onSelectCommunity={(id) => {
                const found = displayCommunities.find((c) => c.id === id || c.handle.toLowerCase() === id.toLowerCase());
                if (found) handleSelectCommunity(found);
                else handleSelectCommunity(id);
              }}
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
              onStartDirectChat={handleStartDirectChat}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              language={language}
              onMarkAllAsRead={handleMarkAllNotificationsAsRead}
              onClearNotifications={handleClearNotifications}
              onMarkAsRead={handleMarkNotificationAsRead}
              onSelectTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'messages' && (
            <DirectMessagesView
              user={user}
              allUsers={allUsers}
              language={language}
              initialTargetUser={directChatTargetUser}
              onSelectUser={(u) => handleSelectUser(u)}
              onTriggerNotification={triggerNotification}
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
              communities={displayCommunities}
              user={user}
              allUsers={allUsers}
              language={language}
              onToggleJoin={handleToggleJoinCommunity}
              onCreateCommunity={handleCreateCommunity}
              onUpdateCommunity={handleUpdateCommunity}
              onDeleteCommunity={handleDeleteCommunity}
              onSelectCommunity={handleSelectCommunity}
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
              communities={displayCommunities}
              onUpdateProfile={handleUpdateProfile}
              onSelectCommunity={(comm) => handleSelectCommunity(comm)}
              onLikePost={handleLikePost}
              onRepostPost={handleRepostPost}
              onBookmarkPost={handleBookmarkPost}
              onDeletePost={handleDeletePost}
              onAddComment={handleAddComment}
              onSelectUser={(uname) => handleSelectUser(uname)}
              onStartDirectChat={handleStartDirectChat}
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
              onDeletePost={handleDeletePost}
              posts={posts}
            />
          )}

          <RightPanel
            communities={displayCommunities}
            trends={dynamicTrends}
            platformSettings={platformSettings}
            language={language}
            onToggleJoinCommunity={handleToggleJoinCommunity}
            onSelectCommunity={handleSelectCommunity}
            onSelectTrend={(trend) => handleSelectHashtag(trend.topic || trend.tag)}
          />
        </main>
      </div>

      <FileUploadWarningBanner onOpenSupportTab={() => setActiveTab('support')} />

      <NewPostModal
        isOpen={isNewPostOpen}
        user={user}
        communities={displayCommunities}
        language={language}
        onClose={() => setIsNewPostOpen(false)}
        onCreatePost={handleCreatePost}
      />

      <UserProfileModal
        isOpen={!!selectedModalUsername}
        username={selectedModalUsername}
        onClose={handleCloseProfileModal}
        currentUser={user}
        communities={displayCommunities}
        language={language}
        onToggleJoinCommunity={handleToggleJoinCommunity}
        onNavigateToFullProfile={(profile) => {
          setViewingUser(profile);
          setActiveTab('profile');
        }}
        onStartDirectChat={handleStartDirectChat}
      />

      <ReportErrorModal
        isOpen={isReportErrorOpen}
        onClose={() => setIsReportErrorOpen(false)}
        currentUser={user}
        language={language}
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

