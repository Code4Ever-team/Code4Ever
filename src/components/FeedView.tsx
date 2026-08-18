import React, { useState, useEffect, useRef } from 'react';
import { Post, UserProfile, GitHubRepo, Community } from '../types';
import { UserBadges } from './UserBadges';
import { CodeSnippetBlock } from './CodeSnippetBlock';
import { MessageSquare, Heart, Repeat, Send, Code, Sparkles, Trash2, Bookmark, Share2, Check, GitBranch, ExternalLink, Star, GitFork, Image as ImageIcon, Video, Loader2, Users, Shield, Copy, User, AlertCircle } from 'lucide-react';
import { getGitHubToken } from '../services/firebaseClient';
import { validateFileSize, notifyFileSizeExceeded } from '../utils/fileUploadHelper';

interface FeedViewProps {
  posts: Post[];
  user: UserProfile;
  allUsers?: UserProfile[];
  communities?: Community[];
  language: 'tr' | 'en';
  selectedHashtag?: string | null;
  onClearHashtag?: () => void;
  onSelectHashtag?: (hashtag: string) => void;
  onLikePost: (id: string) => void;
  onRepostPost: (id: string) => void;
  onBookmarkPost: (id: string) => void;
  onDeletePost: (id: string) => void;
  onCreatePost: (
    content: string,
    codeSnippet?: { title: string; language: string; code: string },
    selectedRepo?: GitHubRepo,
    mediaUrl?: string,
    mediaType?: 'image' | 'video',
    communityId?: string,
    communityName?: string,
    communityHandle?: string
  ) => Promise<boolean> | boolean | void;
  onAddComment: (postId: string, commentText: string) => void;
  onSelectUser: (username: string) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  posts,
  user,
  allUsers = [],
  communities = [],
  language,
  selectedHashtag,
  onClearHashtag,
  onSelectHashtag,
  onLikePost,
  onRepostPost,
  onBookmarkPost,
  onDeletePost,
  onCreatePost,
  onAddComment,
  onSelectUser
}) => {
  const [content, setContent] = useState('');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [showCodeAttach, setShowCodeAttach] = useState(false);
  const [codeTitle, setCodeTitle] = useState('');
  const [codeLang, setCodeLang] = useState('TypeScript');
  const [codeSnippet, setCodeSnippet] = useState('');

  const [showRepoAttach, setShowRepoAttach] = useState(false);
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Right-click context menu state (specifically for nylithra / admins)
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    post: Post | null;
  }>({ visible: false, x: 0, y: 0, post: null });

  const isNylithra =
    user?.username?.toLowerCase() === 'nylithra' ||
    user?.display_name?.toLowerCase() === 'nylithra' ||
    user?.role?.toLowerCase() === 'admin' ||
    user?.role?.toLowerCase() === 'founder';

  useEffect(() => {
    const handleWindowClick = () => {
      setContextMenu({ visible: false, x: 0, y: 0, post: null });
    };
    const handleWindowScroll = () => {
      setContextMenu({ visible: false, x: 0, y: 0, post: null });
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu({ visible: false, x: 0, y: 0, post: null });
      }
    };

    window.addEventListener('click', handleWindowClick);
    window.addEventListener('scroll', handleWindowScroll);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePostContextMenu = (e: React.MouseEvent, post: Post) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 240;
    const menuHeight = 220;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 16);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 16);
    setContextMenu({ visible: true, x, y, post });
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (15MB for normal users, 250MB for Spark supporters)
    const validation = validateFileSize(file, user);
    if (!validation.isValid) {
      notifyFileSizeExceeded(validation);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
      return;
    }

    const isVid = file.type.startsWith('video');
    const isImg = file.type.startsWith('image');

    if (!isVid && !isImg) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setMediaUrl(ev.target.result as string);
        setMediaType(isVid ? 'video' : 'image');
      }
    };
    reader.readAsDataURL(file);
  };

  const fetchRepos = async () => {
    if (!user.username) return;
    setLoadingRepos(true);
    try {
      const token = getGitHubToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`https://api.github.com/users/${user.username}/repos?sort=updated&per_page=30`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUserRepos(data);
      }
    } catch {
      setUserRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    if (showRepoAttach && userRepos.length === 0) {
      fetchRepos();
    }
  }, [showRepoAttach]);

  const MAX_CONTENT_LENGTH = 200;
  const MAX_CODE_LENGTH = 2000;

  const isContentOver = content.length > MAX_CONTENT_LENGTH;
  const isCodeOver = showCodeAttach && codeSnippet.length > MAX_CODE_LENGTH;
  const isSubmitDisabled =
    isSubmitting ||
    isContentOver ||
    isCodeOver ||
    (!content.trim() && !codeSnippet.trim() && !selectedRepo && !mediaUrl);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isContentOver || isCodeOver) return;
    if (!content.trim() && !codeSnippet.trim() && !selectedRepo && !mediaUrl) return;

    setIsSubmitting(true);
    let attachedSnippet;
    if (showCodeAttach && codeSnippet.trim()) {
      attachedSnippet = {
        title: codeTitle.trim() || 'Snippet',
        language: codeLang,
        code: codeSnippet.trim()
      };
    }

    const selectedComm = communities.find((c) => c.id === selectedCommunityId);

    try {
      const res = await onCreatePost(
        content.trim(),
        attachedSnippet,
        selectedRepo || undefined,
        mediaUrl || undefined,
        mediaType || undefined,
        selectedComm?.id,
        selectedComm?.name,
        selectedComm?.handle
      );

      if (res !== false) {
        setContent('');
        setCodeTitle('');
        setCodeSnippet('');
        setShowCodeAttach(false);
        setShowRepoAttach(false);
        setSelectedRepo(null);
        setMediaUrl(null);
        setMediaType(null);
        setSelectedCommunityId(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(postId, commentText.trim());
    setCommentText('');
  };

  const handleShare = (post: Post) => {
    const url = `https://code4ever.ai.studio/@${post.author.username}#post-${post.id}`;
    navigator.clipboard.writeText(url);
    setCopiedPostId(post.id);
    setToastMessage(language === 'tr' ? 'Gönderi bağlantısı kopyalandı!' : 'Post link copied to clipboard!');
    setTimeout(() => {
      setCopiedPostId(null);
      setToastMessage(null);
    }, 2500);
  };

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b] relative">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-zinc-900 border border-zinc-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span>{language === 'tr' ? 'Ana Sayfa' : 'Home'}</span>
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
        </h2>
      </div>

      <div className="p-4 border-b border-zinc-800/60 bg-[#0c0c0e]">
        <form onSubmit={handlePostSubmit} className="space-y-3">
          <div className="flex gap-3">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user.display_name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-800 flex-shrink-0 cursor-pointer"
              onClick={() => onSelectUser(user.username)}
            />
            <div className="flex-1 space-y-2">
              {/* Target Community Selection for Inline Feed Post */}
              {communities && communities.filter((c) => c.is_joined).length > 0 && (
                <div className="flex items-center gap-2 pb-1">
                  <select
                    value={selectedCommunityId || ''}
                    onChange={(e) => setSelectedCommunityId(e.target.value || null)}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] rounded-lg px-2.5 py-1 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="">🌐 {language === 'tr' ? 'Herkese Açık (Genel Feed)' : 'Public Feed'}</option>
                    {communities
                      .filter((c) => c.is_joined)
                      .map((comm) => (
                        <option key={comm.id} value={comm.id}>
                          👥 {comm.name} ({comm.handle})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    language === 'tr'
                      ? 'Ne düşünüyorsun? Proje veya kod parçacığı paylaş...'
                      : 'What are you working on? Share a project or snippet...'
                  }
                  rows={3}
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none pb-7"
                />

                {/* Right bottom character counter for Feed Text Box */}
                <div className="absolute right-1 bottom-1">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md transition-all shadow-sm ${
                      content.length > MAX_CONTENT_LENGTH
                        ? 'bg-red-500/20 text-red-400 border border-red-500/50 font-bold animate-pulse'
                        : content.length >= 150
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-semibold'
                        : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800'
                    }`}
                    title={
                      content.length > MAX_CONTENT_LENGTH
                        ? (language === 'tr' ? 'Karakter sınırı aşıldı! Maksimum 200 karakter.' : 'Character limit exceeded! Max 200 chars.')
                        : undefined
                    }
                  >
                    {content.length}/{MAX_CONTENT_LENGTH}
                  </span>
                </div>
              </div>

              {mediaUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black max-h-56">
                  {mediaType === 'video' ? (
                    <video src={mediaUrl} controls className="w-full h-full max-h-56 object-cover" />
                  ) : (
                    <img src={mediaUrl} alt="Preview" className="w-full h-full max-h-56 object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMediaUrl(null);
                      setMediaType(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {showCodeAttach && (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codeTitle}
                      onChange={(e) => setCodeTitle(e.target.value)}
                      placeholder={language === 'tr' ? 'Kod Başlığı' : 'Snippet Title'}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                    />
                    <select
                      value={codeLang}
                      onChange={(e) => setCodeLang(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                    >
                      <option value="TypeScript">TypeScript</option>
                      <option value="React">React</option>
                      <option value="Python">Python</option>
                      <option value="Rust">Rust</option>
                      <option value="Go">Go</option>
                      <option value="SQL">SQL</option>
                      <option value="HTML/CSS">HTML/CSS</option>
                      <option value="C++">C++</option>
                      <option value="Java">Java</option>
                    </select>
                  </div>
                  <div className="relative">
                    <textarea
                      value={codeSnippet}
                      onChange={(e) => setCodeSnippet(e.target.value)}
                      placeholder="code snippet goes here..."
                      rows={4}
                      className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5 text-xs text-emerald-400 font-mono focus:outline-none resize-none pb-7"
                    />
                    {/* Code snippet counter on right bottom */}
                    <div className="absolute right-2 bottom-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md transition-all shadow-sm ${
                          codeSnippet.length > MAX_CODE_LENGTH
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50 font-bold animate-pulse'
                            : codeSnippet.length >= 1500
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-semibold'
                            : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800'
                        }`}
                        title={
                          codeSnippet.length > MAX_CODE_LENGTH
                            ? (language === 'tr' ? 'Kod sınırı aşıldı! Maksimum 2000 karakter.' : 'Code limit exceeded! Max 2000 chars.')
                            : undefined
                        }
                      >
                        {codeSnippet.length}/{MAX_CODE_LENGTH}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {showRepoAttach && (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-white block">
                    {language === 'tr' ? 'GitHub Depolarımdan Seç' : 'Select From My GitHub Repos'}
                  </span>
                  {loadingRepos ? (
                    <div className="text-xs font-mono text-zinc-500 py-2 animate-pulse">
                      {language === 'tr' ? 'GitHub depoları yükleniyor...' : 'Loading repositories...'}
                    </div>
                  ) : userRepos.length === 0 ? (
                    <div className="text-xs font-mono text-zinc-500 py-1">
                      {language === 'tr' ? 'Depo bulunamadı veya yetki verilmedi.' : 'No repositories found.'}
                    </div>
                  ) : (
                    <select
                      onChange={(e) => {
                        const repo = userRepos.find((r) => r.id === Number(e.target.value));
                        setSelectedRepo(repo || null);
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg p-2 text-xs font-mono focus:outline-none"
                    >
                      <option value="">{language === 'tr' ? '-- Depo Seçin --' : '-- Select Repository --'}</option>
                      {userRepos.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.language || 'Code'}) - ⭐ {r.stargazers_count}
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedRepo && (
                    <div className="p-2.5 bg-zinc-900/80 border border-zinc-700/50 rounded-lg space-y-1 text-xs">
                      <span className="font-bold text-white block">{selectedRepo.name}</span>
                      <p className="text-[11px] text-zinc-400">{selectedRepo.description}</p>
                      <span className="text-[10px] font-mono text-zinc-300 block">{selectedRepo.html_url}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={mediaInputRef}
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleMediaUpload}
                  />
                  <button
                    type="button"
                    onClick={() => mediaInputRef.current?.click()}
                    className="text-xs font-mono flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-zinc-300" />
                    <Video className="w-3.5 h-3.5 text-zinc-300" />
                    <span>{language === 'tr' ? 'Medya' : 'Media'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCodeAttach(!showCodeAttach)}
                    className={`text-xs font-mono flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      showCodeAttach
                        ? 'bg-zinc-800 text-white border border-zinc-700'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{language === 'tr' ? 'Kod Ekle' : 'Add Snippet'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRepoAttach(!showRepoAttach)}
                    className={`text-xs font-mono flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      showRepoAttach
                        ? 'bg-zinc-800 text-white border border-zinc-700'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>{language === 'tr' ? 'Depo Ekle' : 'Attach Repo'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="px-4 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                      <span>{language === 'tr' ? 'Paylaşılıyor...' : 'Posting...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-zinc-950" />
                      <span>{language === 'tr' ? 'Paylaş' : 'Post'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="divide-y divide-zinc-800/40">
        {posts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-300">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {language === 'tr' ? 'Henüz Gönderi Yok' : 'No Posts Yet'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {language === 'tr'
                ? 'İlk gönderiyi paylaşan siz olun!'
                : 'Be the first to share a post!'}
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const authorProfile = (user && (post.author.id === user.id || post.author.username?.toLowerCase() === user.username?.toLowerCase()))
              ? { ...post.author, ...user }
              : (allUsers.find(u => (u.id && u.id === post.author.id) || (u.username && u.username.toLowerCase() === post.author.username?.toLowerCase())) || post.author);

            const userKey = (user.username || user.id || '').toLowerCase();
            const isLiked = Boolean(
              (post.liked_by && post.liked_by.map(k => k.toLowerCase()).includes(userKey)) ||
              post.is_liked
            );
            const isReposted = Boolean(
              (post.reposted_by && post.reposted_by.map(k => k.toLowerCase()).includes(userKey)) ||
              post.is_reposted
            );
            const isBookmarked = Boolean(
              (post.bookmarked_by && post.bookmarked_by.map(k => k.toLowerCase()).includes(userKey)) ||
              post.is_bookmarked ||
              user.saved_post_ids?.includes(post.id)
            );
            const likesCount = (post.liked_by && post.liked_by.length > 0) ? post.liked_by.length : (post.likes_count || 0);
            const repostsCount = (post.reposted_by && post.reposted_by.length > 0) ? post.reposted_by.length : (post.reposts_count || 0);
            const commentsCount = (post.comments && post.comments.length > 0) ? post.comments.length : (post.comments_count || 0);

            return (
              <article
                key={post.id}
                onContextMenu={(e) => handlePostContextMenu(e, post)}
                className={`p-4 hover:bg-zinc-900/30 transition-colors space-y-3 relative ${
                  isNylithra ? 'cursor-context-menu select-text' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={authorProfile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={authorProfile.display_name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-800 cursor-pointer"
                      onClick={() => onSelectUser(authorProfile.username)}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => onSelectUser(authorProfile.username)}
                          className="font-bold text-white text-xs hover:text-blue-400 cursor-pointer transition-colors"
                        >
                          {authorProfile.display_name}
                        </span>
                        <UserBadges user={authorProfile} singleHighestWeightOnly={true} showTextLabels={false} />
                        <span
                          onClick={() => onSelectUser(authorProfile.username)}
                          className="text-xs text-zinc-500 font-mono hover:underline cursor-pointer"
                        >
                          @{authorProfile.username}
                        </span>
                        <span className="text-xs text-zinc-600">·</span>
                        <span className="text-[11px] text-zinc-500 font-mono">{post.time_ago}</span>
                        {post.community_name && (
                          <>
                            <span className="text-xs text-zinc-600">·</span>
                            <span
                              onClick={() => onSelectUser(post.community_handle || post.community_name!)}
                              className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono flex items-center gap-1 cursor-pointer hover:bg-purple-500/20 transition-colors"
                            >
                              <Users className="w-3 h-3" />
                              <span>{post.community_name}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {(authorProfile.username === user.username || isNylithra) && (
                    <button
                      onClick={() => {
                        if (window.confirm(language === 'tr' ? 'Bu gönderiyi silmek istediğinize emin misiniz?' : 'Delete this post?')) {
                          onDeletePost(post.id);
                        }
                      }}
                      title={isNylithra && authorProfile.username !== user.username ? 'Yönetici Olarak Sil' : 'Sil'}
                      className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              {post.content && <p className="text-xs text-zinc-200 leading-relaxed">{post.content}</p>}

              {post.media_url && (
                <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-black max-h-[480px] flex items-center justify-center">
                  {post.media_type === 'video' || post.media_url.startsWith('data:video') ? (
                    <video
                      src={post.media_url}
                      controls
                      playsInline
                      className="w-full max-h-[480px] object-contain rounded-2xl"
                    />
                  ) : (
                    <img
                      src={post.media_url}
                      alt="Post attachment"
                      className="w-full max-h-[480px] object-cover rounded-2xl"
                    />
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
                  {post.project_card.description && (
                    <p className="text-xs text-zinc-400">{post.project_card.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 pt-1">
                    <span className="text-blue-400">{post.project_card.language}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {post.project_card.stars}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3 h-3" /> {post.project_card.forks}</span>
                  </div>
                </div>
              )}

              {post.code_snippet && (
                <CodeSnippetBlock snippet={post.code_snippet} language={language} />
              )}

              <div className="flex items-center gap-6 pt-1 text-xs text-zinc-500 font-mono">
                <button
                  type="button"
                  onClick={() => onLikePost(post.id)}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isLiked ? 'text-red-400' : 'hover:text-red-400'
                  }`}
                  title={isLiked ? (language === 'tr' ? 'Beğeniyi Kaldır' : 'Unlike') : (language === 'tr' ? 'Beğen' : 'Like')}
                >
                  <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current text-red-400' : ''}`} />
                  <span>{likesCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRepostPost(post.id)}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isReposted ? 'text-emerald-400' : 'hover:text-emerald-400'
                  }`}
                  title={isReposted ? (language === 'tr' ? 'Repostu Kaldır' : 'Undo Repost') : (language === 'tr' ? 'Repostla' : 'Repost')}
                >
                  <Repeat className={`w-3.5 h-3.5 ${isReposted ? 'stroke-[2.5px] text-emerald-400' : ''}`} />
                  <span>{repostsCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeCommentPostId === post.id ? 'text-zinc-200 font-semibold' : 'hover:text-zinc-200'
                  }`}
                  title={language === 'tr' ? 'Yorumları Gör ve Yanıtla' : 'Comments'}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{commentsCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onBookmarkPost(post.id)}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isBookmarked ? 'text-amber-400' : 'hover:text-amber-400'
                  }`}
                  title={isBookmarked ? (language === 'tr' ? 'Yer İşaretlerinden Kaldır' : 'Remove Bookmark') : (language === 'tr' ? 'Yer İşaretlerine Kaydet' : 'Bookmark')}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current text-amber-400' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => handleShare(post)}
                  className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                  title={language === 'tr' ? 'Bağlantıyı Kopyala' : 'Copy Link'}
                >
                  {copiedPostId === post.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {activeCommentPostId === post.id && (
                <div className="p-3.5 bg-zinc-950/90 border border-zinc-800/80 rounded-2xl space-y-3 mt-2 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span>{language === 'tr' ? 'Yorumlar' : 'Comments'}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                        {commentsCount}
                      </span>
                    </span>
                  </div>

                  {/* Comments List */}
                  {post.comments && post.comments.length > 0 ? (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {post.comments.map((comment) => {
                        const commentAuthor = allUsers.find(
                          (u) =>
                            (u.username && u.username.toLowerCase() === comment.author?.username?.toLowerCase()) ||
                            (u.id && (comment.author as any)?.id === u.id)
                        ) || comment.author;

                        return (
                          <div
                            key={comment.id}
                            className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/50 space-y-1 hover:border-zinc-700/60 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img
                                  src={commentAuthor.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                  alt={commentAuthor.display_name}
                                  className="w-5 h-5 rounded-full object-cover ring-1 ring-zinc-800 cursor-pointer"
                                  onClick={() => onSelectUser(commentAuthor.username)}
                                />
                                <span
                                  onClick={() => onSelectUser(commentAuthor.username)}
                                  className="text-xs font-bold text-zinc-200 hover:text-blue-400 cursor-pointer transition-colors"
                                >
                                  {commentAuthor.display_name}
                                </span>
                                <UserBadges user={commentAuthor} singleHighestWeightOnly={true} />
                                <span
                                  onClick={() => onSelectUser(commentAuthor.username)}
                                  className="text-[10px] text-zinc-500 font-mono hover:underline cursor-pointer"
                                >
                                  @{commentAuthor.username}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-600 font-mono">
                                {comment.created_at ? new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 pl-7 leading-relaxed font-sans select-text">
                              {comment.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-zinc-500 text-xs font-mono">
                      {language === 'tr' ? 'Henüz yorum yapılmamış. İlk yorumu sen yap!' : 'No comments yet. Be the first to reply!'}
                    </div>
                  )}

                  {/* Add Comment Input */}
                  <form onSubmit={(e) => handleCommentSubmit(post.id, e)} className="flex gap-2 pt-1 border-t border-zinc-800/60">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={language === 'tr' ? 'Düşüncelerini paylaş...' : 'Write a comment...'}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-40 disabled:pointer-events-none text-zinc-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Send className="w-3 h-3 text-zinc-950" />
                      <span>{language === 'tr' ? 'Yanıtla' : 'Reply'}</span>
                    </button>
                  </form>
                </div>
              )}
            </article>
          );
        })
        )}
      </div>

      {/* Right-Click Context Menu for all users */}
      {contextMenu.visible && contextMenu.post && (() => {
        const isPostAuthor =
          (contextMenu.post.author.username?.toLowerCase() === user.username?.toLowerCase()) ||
          (Boolean(user.id) && contextMenu.post.author.id === user.id);
        const canDelete = isPostAuthor || isNylithra;

        return (
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="fixed z-50 min-w-[230px] rounded-2xl bg-[#121215]/95 border border-zinc-700/80 shadow-2xl backdrop-blur-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                {isNylithra ? (
                  <>
                    <Shield className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400">Yönetici Menüsü</span>
                  </>
                ) : isPostAuthor ? (
                  <>
                    <User className="w-3 h-3 text-blue-400" />
                    <span>Gönderiniz</span>
                  </>
                ) : (
                  <>
                    <Code className="w-3 h-3 text-zinc-400" />
                    <span>Gönderi Seçenekleri</span>
                  </>
                )}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">@{contextMenu.post.author.username}</span>
            </div>

            {/* Profile Button */}
            <button
              type="button"
              onClick={() => {
                if (contextMenu.post) {
                  onSelectUser(contextMenu.post.author.username);
                  setContextMenu({ visible: false, x: 0, y: 0, post: null });
                }
              }}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80 transition-colors flex items-center gap-2.5"
            >
              <User className="w-4 h-4 text-blue-400" />
              <span>{language === 'tr' ? 'Yazar Profilini Aç' : 'View Author Profile'}</span>
            </button>

            {/* Copy Link Button */}
            <button
              type="button"
              onClick={() => {
                if (contextMenu.post) {
                  handleShare(contextMenu.post);
                  setContextMenu({ visible: false, x: 0, y: 0, post: null });
                }
              }}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:bg-zinc-800/80 transition-colors flex items-center gap-2.5"
            >
              <Copy className="w-4 h-4 text-zinc-400" />
              <span>{language === 'tr' ? 'Bağlantıyı Kopyala' : 'Copy Post Link'}</span>
            </button>

            {/* Bookmark Button */}
            <button
              type="button"
              onClick={() => {
                if (contextMenu.post) {
                  onBookmarkPost(contextMenu.post.id);
                  setToastMessage(language === 'tr' ? 'Yer işaretleri güncellendi.' : 'Bookmarks updated.');
                  setTimeout(() => setToastMessage(null), 2000);
                  setContextMenu({ visible: false, x: 0, y: 0, post: null });
                }
              }}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:bg-zinc-800/80 transition-colors flex items-center gap-2.5"
            >
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span>
                {user.saved_post_ids?.includes(contextMenu.post.id)
                  ? (language === 'tr' ? 'Yer İşaretlerinden Kaldır' : 'Remove Bookmark')
                  : (language === 'tr' ? 'Yer İşaretlerine Ekle' : 'Save to Bookmarks')}
              </span>
            </button>

            {/* Delete Button (Only for Author or Admin/Nylithra) */}
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  if (contextMenu.post) {
                    const confirmMsg = language === 'tr'
                      ? 'Bu gönderiyi silmek istediğinize emin misiniz?'
                      : 'Are you sure you want to delete this post?';
                    if (window.confirm(confirmMsg)) {
                      onDeletePost(contextMenu.post.id);
                      setToastMessage(language === 'tr' ? 'Gönderi silindi.' : 'Post deleted.');
                      setTimeout(() => setToastMessage(null), 2500);
                      setContextMenu({ visible: false, x: 0, y: 0, post: null });
                    }
                  }
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-500/15 transition-colors flex items-center gap-2.5 border-t border-zinc-800/80 mt-1"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>
                  {isNylithra && !isPostAuthor
                    ? (language === 'tr' ? 'Bu Gönderiyi Sil (Yönetici)' : 'Delete Post (Admin)')
                    : (language === 'tr' ? 'Bu Gönderiyi Sil' : 'Delete Post')}
                </span>
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
};
