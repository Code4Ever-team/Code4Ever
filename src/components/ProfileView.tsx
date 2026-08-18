import React, { useState, useRef } from 'react';
import { UserProfile, DynamicTheme, Community, Post } from '../types';
import { UserBadges } from './UserBadges';
import {
  MapPin,
  Github,
  Calendar,
  Edit3,
  CheckCircle2,
  Shield,
  Link2,
  Upload,
  Users,
  AlertTriangle,
  Repeat,
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Check,
  GitBranch,
  ExternalLink,
  Star,
  GitFork,
  Code,
  Send,
  Trash2,
  Sparkles
} from 'lucide-react';
import { validateFileSize, notifyFileSizeExceeded } from '../utils/fileUploadHelper';

interface ProfileViewProps {
  user: UserProfile;
  currentUser?: UserProfile;
  allUsers?: UserProfile[];
  posts?: Post[];
  theme?: DynamicTheme;
  language: 'tr' | 'en';
  communities?: Community[];
  onUpdateProfile: (updated: UserProfile) => void;
  onUpdateTheme?: (newTheme: DynamicTheme) => void;
  onSelectCommunity?: (comm: Community) => void;
  onLikePost?: (id: string) => void;
  onRepostPost?: (id: string) => void;
  onBookmarkPost?: (id: string) => void;
  onDeletePost?: (id: string) => void;
  onAddComment?: (postId: string, text: string) => void;
  onSelectUser?: (username: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  currentUser,
  allUsers = [],
  posts = [],
  language,
  communities = [],
  onUpdateProfile,
  onSelectCommunity,
  onLikePost,
  onRepostPost,
  onBookmarkPost,
  onDeletePost,
  onAddComment,
  onSelectUser
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(user);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<'posts' | 'reposts' | 'likes' | 'media' | 'communities'>('posts');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const activeUser = currentUser || user;
  const profileUserKey = (user.username || user.id || '').toLowerCase();
  const currentViewerKey = (activeUser.username || activeUser.id || '').toLowerCase();

  const isOwnProfile =
    (currentUser && (currentUser.id === user.id || currentUser.username?.toLowerCase() === user.username?.toLowerCase())) ||
    (!currentUser);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Filter lists
  const userAuthoredPosts = posts.filter(
    (p) => (p.author.username?.toLowerCase() === profileUserKey) || ((p.author as any).id === user.id)
  );

  const userRepostedPosts = posts.filter(
    (p) => p.reposted_by && p.reposted_by.map((k) => k.toLowerCase()).includes(profileUserKey)
  );

  const userLikedPosts = posts.filter(
    (p) => p.liked_by && p.liked_by.map((k) => k.toLowerCase()).includes(profileUserKey)
  );

  const userMediaPosts = posts.filter(
    (p) =>
      ((p.author.username?.toLowerCase() === profileUserKey) || ((p.author as any).id === user.id)) &&
      (p.media_url || p.project_card || p.code_snippet)
  );

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFileSize(file, user);
      if (!validation.isValid) {
        notifyFileSizeExceeded(validation);
        if (avatarInputRef.current) avatarInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFormData((prev) => ({ ...prev, avatar_url: ev.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFileSize(file, user);
      if (!validation.isValid) {
        notifyFileSizeExceeded(validation);
        if (bannerInputRef.current) bannerInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFormData((prev) => ({ ...prev, banner_url: ev.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = formData.username
      .replace(/^@/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '') || user.username;

    // Check conflict with communities
    const isCommunityConflict = communities.some((c) => {
      const cHandle = c.handle.replace(/^@/, '').toLowerCase();
      const cName = c.name.toLowerCase();
      return cHandle === cleanUsername || cName === cleanUsername;
    });

    if (isCommunityConflict) {
      setErrorMessage(
        language === 'tr'
          ? `⚠️ "@${cleanUsername}" adı zaten mevcut bir topluluk tarafından kullanılıyor! Lütfen başka bir kullanıcı adı seçin.`
          : `⚠️ "@${cleanUsername}" is already used by a community! Please choose a different username.`
      );
      return;
    }

    const updatedProfile = {
      ...formData,
      username: cleanUsername
    };

    onUpdateProfile(updatedProfile);
    setIsEditing(false);
  };

  const handleCommentSubmit = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !onAddComment) return;
    onAddComment(postId, commentText.trim());
    setCommentText('');
  };

  const handleShare = (post: Post) => {
    const url = `https://code4ever.ai.studio/@${post.author.username}#post-${post.id}`;
    navigator.clipboard.writeText(url);
    setCopiedPostId(post.id);
    setTimeout(() => {
      setCopiedPostId(null);
    }, 2500);
  };

  const profileUrl = `code4ever.ai.studio/@${formData.username || 'user'}`;

  const displayedList =
    profileTab === 'posts'
      ? userAuthoredPosts
      : profileTab === 'reposts'
      ? userRepostedPosts
      : profileTab === 'likes'
      ? userLikedPosts
      : userMediaPosts;

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b]">
      <div className="relative group">
        <div className="h-44 w-full overflow-hidden bg-zinc-900 relative">
          <img
            src={formData.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'}
            alt="Profile Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-black/30" />
        </div>

        <div className="px-6 relative -mt-14 flex items-end justify-between pb-4 border-b border-zinc-800/40">
          <div className="relative">
            <img
              src={formData.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
              alt={formData.display_name}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-[#09090b] shadow-2xl bg-zinc-900"
            />
          </div>

          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700/60 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>
                {isEditing
                  ? (language === 'tr' ? 'Düzenlemeyi Kapat' : 'Close Edit')
                  : (language === 'tr' ? 'Profili Düzenle' : 'Edit Profile')}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="p-5 w-full space-y-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight">{formData.display_name}</h2>
            <UserBadges user={formData} showTextLabels={false} />
          </div>
          <p className="text-xs text-zinc-400 font-mono">@{formData.username}</p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-blue-400">
            <Link2 className="w-3.5 h-3.5" />
            <span>{profileUrl}</span>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed bg-[#0c0c0e] p-3 rounded-xl border border-zinc-800/40">
          {formData.bio || (language === 'tr' ? 'Code4Ever geliştirici üyesi.' : 'Code4Ever developer member.')}
        </p>

        <div className="flex flex-wrap gap-4 text-xs font-mono text-zinc-400 border-b border-zinc-800/40 pb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-zinc-500" />
            {formData.custom_fields?.location || 'Türkiye'}
          </span>
          <a
            href={`https://github.com/${formData.username}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-white"
          >
            <Github className="w-3.5 h-3.5 text-zinc-500" />
            github.com/{formData.username}
          </a>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            {language === 'tr' ? 'Katılım: 2026' : 'Joined: 2026'}
          </span>
        </div>

        {/* Profile Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-800/80 pt-2 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setProfileTab('posts')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              profileTab === 'posts'
                ? 'text-blue-400 border-blue-500 bg-blue-500/5'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            <span>{language === 'tr' ? 'Gönderiler' : 'Posts'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 font-mono text-zinc-400">
              {userAuthoredPosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('reposts')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              profileTab === 'reposts'
                ? 'text-emerald-400 border-emerald-500 bg-emerald-500/5'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Repostlar' : 'Reposts'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 font-mono text-zinc-400">
              {userRepostedPosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('likes')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              profileTab === 'likes'
                ? 'text-red-400 border-red-500 bg-red-500/5'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Beğeniler' : 'Likes'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 font-mono text-zinc-400">
              {userLikedPosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('media')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              profileTab === 'media'
                ? 'text-purple-400 border-purple-500 bg-purple-500/5'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Projeler & Medya' : 'Projects & Media'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 font-mono text-zinc-400">
              {userMediaPosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('communities')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              profileTab === 'communities'
                ? 'text-amber-400 border-amber-500 bg-amber-500/5'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Topluluklar' : 'Communities'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 font-mono text-zinc-400">
              {communities.filter((c) => c.is_joined).length}
            </span>
          </button>
        </div>

        {/* Tab Contents */}
        {profileTab === 'communities' ? (
          <div className="bg-[#0c0c0e] border border-zinc-800/50 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>{language === 'tr' ? 'Üye Olduğu Topluluklar' : 'Joined Communities'}</span>
            </h3>
            {communities.filter((c) => c.is_joined).length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-xs font-mono">
                {language === 'tr' ? 'Henüz hiçbir topluluğa katılmadı.' : 'Has not joined any communities yet.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {communities
                  .filter((c) => c.is_joined)
                  .map((comm) => (
                    <div
                      key={comm.id}
                      onClick={() => onSelectCommunity && onSelectCommunity(comm)}
                      className="p-2.5 bg-zinc-950/80 border border-zinc-800/60 hover:border-purple-500/50 rounded-xl flex items-center gap-3 transition-all cursor-pointer group"
                    >
                      <img
                        src={comm.avatar_url}
                        alt={comm.name}
                        className="w-8 h-8 rounded-xl object-cover ring-1 ring-zinc-800 flex-shrink-0"
                      />
                      <div className="truncate">
                        <span className="text-xs font-bold text-white truncate block group-hover:text-purple-300">
                          {comm.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono block truncate">{comm.handle}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {displayedList.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-[#0c0c0e] rounded-2xl border border-zinc-800/40">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                  {profileTab === 'reposts' ? (
                    <Repeat className="w-5 h-5 text-emerald-400" />
                  ) : profileTab === 'likes' ? (
                    <Heart className="w-5 h-5 text-red-400" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-white">
                  {profileTab === 'reposts'
                    ? (language === 'tr' ? 'Henüz Repost Yok' : 'No Reposts Yet')
                    : profileTab === 'likes'
                    ? (language === 'tr' ? 'Henüz Beğeni Yok' : 'No Liked Posts Yet')
                    : profileTab === 'media'
                    ? (language === 'tr' ? 'Henüz Proje veya Medya Yok' : 'No Media or Projects Yet')
                    : (language === 'tr' ? 'Henüz Gönderi Paylaşılmadı' : 'No Posts Shared Yet')}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {profileTab === 'reposts'
                    ? (language === 'tr' ? 'Kullanıcının yeniden paylaştığı gönderiler burada listelenir.' : 'Posts reposted by the user will appear here.')
                    : (language === 'tr' ? 'Kullanıcı gönderileri burada görüntülenecektir.' : 'Posts will be displayed here.')}
                </p>
              </div>
            ) : (
              displayedList.map((post) => {
                const authorProfile =
                  (post.author.username?.toLowerCase() === user.username?.toLowerCase())
                    ? { ...post.author, ...user }
                    : (allUsers.find(
                        (u) =>
                          (u.username && u.username.toLowerCase() === post.author.username?.toLowerCase()) ||
                          (u.id && u.id === post.author.id)
                      ) || post.author);

                const isLiked = Boolean(
                  (post.liked_by && post.liked_by.map((k) => k.toLowerCase()).includes(currentViewerKey)) ||
                  post.is_liked
                );
                const isReposted = Boolean(
                  (post.reposted_by && post.reposted_by.map((k) => k.toLowerCase()).includes(currentViewerKey)) ||
                  post.is_reposted
                );
                const isBookmarked = Boolean(
                  (post.bookmarked_by && post.bookmarked_by.map((k) => k.toLowerCase()).includes(currentViewerKey)) ||
                  post.is_bookmarked ||
                  activeUser.saved_post_ids?.includes(post.id)
                );

                const likesCount = post.liked_by && post.liked_by.length > 0 ? post.liked_by.length : (post.likes_count || 0);
                const repostsCount = post.reposted_by && post.reposted_by.length > 0 ? post.reposted_by.length : (post.reposts_count || 0);
                const commentsCount = post.comments && post.comments.length > 0 ? post.comments.length : (post.comments_count || 0);

                return (
                  <article
                    key={`${post.id}_${profileTab}`}
                    className="p-4 hover:bg-zinc-900/30 transition-colors space-y-3 border-b border-zinc-800/40 first:border-t-0"
                  >
                    {/* Repost Header Indicator */}
                    {profileTab === 'reposts' && (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono font-semibold pb-1">
                        <Repeat className="w-3.5 h-3.5" />
                        <span>{user.display_name} {language === 'tr' ? 'tarafından repostlandı' : 'reposted'}</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={authorProfile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={authorProfile.display_name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-800 cursor-pointer"
                          onClick={() => onSelectUser && onSelectUser(authorProfile.username)}
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              onClick={() => onSelectUser && onSelectUser(authorProfile.username)}
                              className="font-bold text-white text-xs hover:text-blue-400 cursor-pointer transition-colors"
                            >
                              {authorProfile.display_name}
                            </span>
                            <UserBadges user={authorProfile} singleHighestWeightOnly={true} />
                            <span
                              onClick={() => onSelectUser && onSelectUser(authorProfile.username)}
                              className="text-xs text-zinc-500 font-mono hover:underline cursor-pointer"
                            >
                              @{authorProfile.username}
                            </span>
                            <span className="text-xs text-zinc-600">·</span>
                            <span className="text-[11px] text-zinc-500 font-mono">{post.time_ago}</span>
                          </div>
                        </div>
                      </div>

                      {onDeletePost && (authorProfile.username === activeUser.username || activeUser.role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(language === 'tr' ? 'Bu gönderiyi silmek istediğinize emin misiniz?' : 'Delete this post?')) {
                              onDeletePost(post.id);
                            }
                          }}
                          className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {post.content && <p className="text-xs text-zinc-200 leading-relaxed font-sans">{post.content}</p>}

                    {post.media_url && (
                      <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-black max-h-[480px] flex items-center justify-center">
                        {post.media_type === 'video' || post.media_url.startsWith('data:video') ? (
                          <video src={post.media_url} controls playsInline className="w-full max-h-[480px] object-contain rounded-2xl" />
                        ) : (
                          <img src={post.media_url} alt="Post attachment" className="w-full max-h-[480px] object-cover rounded-2xl" />
                        )}
                      </div>
                    )}

                    {post.project_card && (
                      <div className="p-3 bg-[#0c0c0e] border border-blue-900/40 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white flex items-center gap-1.5">
                            <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                            <span>{post.project_card.title}</span>
                          </span>
                          <a
                            href={`https://github.com/${post.author.username}/${post.project_card.title}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-zinc-400 hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        {post.project_card.description && <p className="text-xs text-zinc-400">{post.project_card.description}</p>}
                        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 pt-1">
                          <span className="text-blue-400">{post.project_card.language}</span>
                          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {post.project_card.stars}</span>
                          <span className="flex items-center gap-1"><GitFork className="w-3 h-3" /> {post.project_card.forks}</span>
                        </div>
                      </div>
                    )}

                    {post.code_snippet && (
                      <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1.5 font-mono">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800/60 pb-1.5">
                          <span className="font-semibold text-white">{post.code_snippet.title}</span>
                          <span className="text-blue-400">{post.code_snippet.language}</span>
                        </div>
                        <pre className="text-xs text-emerald-400 overflow-x-auto p-1 leading-relaxed">
                          <code>{post.code_snippet.code}</code>
                        </pre>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center gap-6 pt-1 text-xs text-zinc-500 font-mono">
                      {onLikePost && (
                        <button
                          type="button"
                          onClick={() => onLikePost(post.id)}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isLiked ? 'text-red-400' : 'hover:text-red-400'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current text-red-400' : ''}`} />
                          <span>{likesCount}</span>
                        </button>
                      )}

                      {onRepostPost && (
                        <button
                          type="button"
                          onClick={() => onRepostPost(post.id)}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isReposted ? 'text-emerald-400' : 'hover:text-emerald-400'
                          }`}
                        >
                          <Repeat className={`w-3.5 h-3.5 ${isReposted ? 'stroke-[2.5px] text-emerald-400' : ''}`} />
                          <span>{repostsCount}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                          activeCommentPostId === post.id ? 'text-blue-400 font-semibold' : 'hover:text-blue-400'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{commentsCount}</span>
                      </button>

                      {onBookmarkPost && (
                        <button
                          type="button"
                          onClick={() => onBookmarkPost(post.id)}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isBookmarked ? 'text-amber-400' : 'hover:text-amber-400'
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current text-amber-400' : ''}`} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleShare(post)}
                        className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedPostId === post.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Comments Drawer */}
                    {activeCommentPostId === post.id && (
                      <div className="p-3.5 bg-zinc-950/90 border border-zinc-800/80 rounded-2xl space-y-3 mt-2">
                        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                            <span>{language === 'tr' ? 'Yorumlar' : 'Comments'}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                              {commentsCount}
                            </span>
                          </span>
                        </div>

                        {post.comments && post.comments.length > 0 ? (
                          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/50 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={comment.author?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                      alt={comment.author?.display_name}
                                      className="w-5 h-5 rounded-full object-cover ring-1 ring-zinc-800"
                                    />
                                    <span className="text-xs font-bold text-zinc-200">{comment.author?.display_name}</span>
                                    <span className="text-[10px] text-zinc-500 font-mono">@{comment.author?.username}</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-600 font-mono">
                                    {comment.created_at ? new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-300 pl-7 leading-relaxed font-sans">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-2 text-center text-zinc-500 text-xs font-mono">
                            {language === 'tr' ? 'Henüz yorum yapılmamış.' : 'No comments yet.'}
                          </div>
                        )}

                        {onAddComment && (
                          <form onSubmit={(e) => handleCommentSubmit(post.id, e)} className="flex gap-2 pt-1 border-t border-zinc-800/60">
                            <input
                              type="text"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder={language === 'tr' ? 'Yorum yazın...' : 'Write a comment...'}
                              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                            />
                            <button
                              type="submit"
                              disabled={!commentText.trim()}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5"
                            >
                              <Send className="w-3 h-3" />
                              <span>{language === 'tr' ? 'Yanıtla' : 'Reply'}</span>
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleFormSubmit} className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-4 space-y-3 mt-4">
            <h3 className="text-xs font-bold text-white border-b border-zinc-800/40 pb-2">
              {language === 'tr' ? 'Profil Bilgilerini Özelleştir' : 'Customize Profile Details'}
            </h3>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-mono text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Kullanıcı Adı (@username)' : 'Username (@username)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500 font-mono">@</span>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Görünen Ad' : 'Display Name'}
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Profil Fotoğrafı' : 'Avatar Image'}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none font-mono"
                  />
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-mono text-xs flex items-center gap-1 flex-shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>{language === 'tr' ? 'Yükle' : 'Upload'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Banner Görseli' : 'Banner Image'}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={formData.banner_url}
                    onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none font-mono"
                  />
                  <input
                    type="file"
                    ref={bannerInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                  />
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-mono text-xs flex items-center gap-1 flex-shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>{language === 'tr' ? 'Yükle' : 'Upload'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Biyografi' : 'Bio'}
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer"
            >
              {language === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes'}
            </button>
          </form>
        ) : (
          <div className="bg-[#0c0c0e] border border-zinc-800/40 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>{language === 'tr' ? 'Hesap Doğrulama' : 'Account Verification'}</span>
            </h3>
            <div className="space-y-1.5 text-xs font-mono text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>GitHub OAuth Linked</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
