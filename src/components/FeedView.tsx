import React, { useState, useEffect, useRef } from 'react';
import { Post, UserProfile, GitHubRepo, Community } from '../types';
import { UserBadges } from './UserBadges';
import { CodeSnippetBlock } from './CodeSnippetBlock';
import { ReportPostModal } from './ReportPostModal';
import { CategorySelector } from './CategorySelector';
import { getStoredCategories, DynamicCategory } from '../utils/categoryHelper';
import {
  MessageSquare,
  Heart,
  Repeat,
  Send,
  Code,
  Sparkles,
  Trash2,
  Bookmark,
  Share2,
  Check,
  GitBranch,
  ExternalLink,
  Star,
  GitFork,
  Image as ImageIcon,
  Video,
  Loader2,
  Users,
  Shield,
  Copy,
  User,
  AlertCircle,
  Tag,
  Filter,
  Flag,
  MoreHorizontal
} from 'lucide-react';
import { getGitHubToken } from '../services/supabaseClient';
import { validateFileSize, notifyFileSizeExceeded } from '../utils/fileUploadHelper';
import { formatTimeAgo } from '../utils/timeAgo';
import { verifyAdminAccess } from '../utils/securityHelper';

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
    communityHandle?: string,
    category?: string,
    categoryName?: string
  ) => Promise<boolean> | boolean | void;
  onAddComment: (postId: string, commentText: string) => void;
  onSelectUser: (username: string) => void;
  onSelectCommunity?: (community: Community | string) => void;
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
  onSelectUser,
  onSelectCommunity
}) => {
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('genel');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Genel & Sohbet');
  const [feedCategoryFilter, setFeedCategoryFilter] = useState<string>('all');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState<DynamicCategory[]>([]);

  useEffect(() => {
    setDynamicCategories(getStoredCategories());
  }, []);

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
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [postToReport, setPostToReport] = useState<Post | null>(null);

  // Right-click / long-press context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    post: Post | null;
  }>({ visible: false, x: 0, y: 0, post: null });

  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const [longPressingPostId, setLongPressingPostId] = useState<string | null>(null);

  const isNylithra = verifyAdminAccess(user);

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
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
    };
  }, []);

  const handlePostContextMenu = (e: React.MouseEvent, post: Post) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 240;
    const menuHeight = 240;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 16);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 16);
    setContextMenu({ visible: true, x, y, post });
  };

  const handleTouchStart = (e: React.TouchEvent, post: Post) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    setLongPressingPostId(post.id);

    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }

    touchTimerRef.current = setTimeout(() => {
      if (touchStartPosRef.current) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(50);
          } catch {}
        }
        const posX = touchStartPosRef.current.x;
        const posY = touchStartPosRef.current.y;
        const menuWidth = 240;
        const menuHeight = 240;
        const x = Math.min(Math.max(16, posX - 100), window.innerWidth - menuWidth - 16);
        const y = Math.min(Math.max(16, posY - 50), window.innerHeight - menuHeight - 16);
        setContextMenu({ visible: true, x, y, post });
      }
      setLongPressingPostId(null);
      touchTimerRef.current = null;
    }, 550);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !touchTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
      touchStartPosRef.current = null;
      setLongPressingPostId(null);
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    touchStartPosRef.current = null;
    setLongPressingPostId(null);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
  const MAX_CODE_LENGTH = 5000;

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
        selectedComm?.handle,
        selectedCategoryId,
        selectedCategoryName || selectedCategoryId
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
        setSelectedCategoryId('genel');
        setSelectedCategoryName('Genel & Sohbet');
        setDynamicCategories(getStoredCategories());
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

  // Build combined unique categories from stored categories + posts
  const combinedCategoryList = (() => {
    const map = new Map<string, { id: string; name: string; icon: string }>();
    dynamicCategories.forEach((c) => {
      map.set(c.id, { id: c.id, name: c.name, icon: c.icon || '🏷️' });
    });
    posts.forEach((p) => {
      if (p.category && !map.has(p.category)) {
        map.set(p.category, {
          id: p.category,
          name: p.category_name || p.category,
          icon: '🏷️'
        });
      }
    });
    return Array.from(map.values());
  })();

  // Filter posts by category and hashtag
  const filteredPosts = posts.filter((post) => {
    if (selectedHashtag) {
      const tag = selectedHashtag.toLowerCase();
      const contentHas = (post.content || '').toLowerCase().includes(tag);
      const snippetHas = (post.code_snippet?.code || '').toLowerCase().includes(tag);
      if (!contentHas && !snippetHas) return false;
    }

    if (feedCategoryFilter !== 'all') {
      const postCat = post.category || 'genel';
      if (postCat !== feedCategoryFilter) return false;
    }

    return true;
  });

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b] relative">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-zinc-900 border border-zinc-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span>{language === 'tr' ? 'Akış & Gönderiler' : 'Feed & Posts'}</span>
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
        </h2>

        {selectedHashtag && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
            <span>{selectedHashtag}</span>
            <button onClick={onClearHashtag} className="hover:text-white font-bold ml-1 cursor-pointer">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Category Pills Filter Bar */}
      <div className="px-4 py-2.5 bg-[#0a0a0c] border-b border-zinc-800/60 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFeedCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            feedCategoryFilter === 'all'
              ? 'bg-zinc-100 text-zinc-950 shadow-md font-extrabold'
              : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
          }`}
        >
          <span>🌟</span>
          <span>{language === 'tr' ? 'Tüm Akış' : 'All Posts'}</span>
        </button>

        {combinedCategoryList.map((cat) => {
          const isActive = feedCategoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFeedCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer font-medium ${
                isActive
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-md'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
              }`}
            >
              <span>{cat.icon || '🏷️'}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Post Composer */}
      <div className="p-4 border-b border-zinc-800/60 bg-[#0c0c0e]">
        <form onSubmit={handlePostSubmit} className="space-y-3">
          <div className="flex gap-3">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user.display_name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-800 flex-shrink-0 cursor-pointer"
              onClick={() => onSelectUser(user.username)}
            />
            <div className="flex-1 space-y-2.5">
              {/* Category & Community Target Selector Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Dynamic Category Selector */}
                <CategorySelector
                  selectedCategoryId={selectedCategoryId}
                  selectedCategoryName={selectedCategoryName}
                  onSelectCategory={(id, name) => {
                    setSelectedCategoryId(id);
                    setSelectedCategoryName(name);
                    setDynamicCategories(getStoredCategories());
                  }}
                  username={user.username}
                  language={language}
                />

                {/* Community Picker (If joined) */}
                <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs min-h-[38px]">
                  <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>{language === 'tr' ? 'Topluluk:' : 'Scope:'}</span>
                  </span>
                  <select
                    value={selectedCommunityId || ''}
                    onChange={(e) => setSelectedCommunityId(e.target.value || null)}
                    className="bg-zinc-900 border border-zinc-700/80 text-zinc-200 text-xs rounded-lg px-2 py-1 focus:outline-none font-mono cursor-pointer max-w-[130px]"
                  >
                    <option value="" className="bg-zinc-900 text-zinc-400">
                      {language === 'tr' ? '🌐 Genel Feed' : '🌐 General Feed'}
                    </option>
                    {communities
                      .filter((c) => c.is_joined)
                      .map((comm) => (
                        <option key={comm.id} value={comm.id} className="bg-zinc-900 text-white">
                          👥 {comm.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Textarea Input */}
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    language === 'tr'
                      ? 'Ne düşünüyorsun? Proje, soru veya kod parçacığı paylaş...'
                      : 'What are you working on? Share a project, question or snippet...'
                  }
                  rows={3}
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none pb-7"
                />

                {/* Character Counter */}
                <div className="absolute right-1 bottom-1">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md transition-all shadow-sm ${
                      content.length > MAX_CONTENT_LENGTH
                        ? 'bg-red-500/20 text-red-400 border border-red-500/50 font-bold animate-pulse'
                        : content.length >= 150
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-semibold'
                        : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {content.length}/{MAX_CONTENT_LENGTH}
                  </span>
                </div>
              </div>

              {/* Media Preview */}
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

              {/* Code Snippet Input Box */}
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
                    <div className="absolute right-2 bottom-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md transition-all shadow-sm ${
                          codeSnippet.length > MAX_CODE_LENGTH
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50 font-bold animate-pulse'
                            : codeSnippet.length >= 4000
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-semibold'
                            : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800'
                        }`}
                        title={
                          codeSnippet.length > MAX_CODE_LENGTH
                            ? (language === 'tr' ? 'Kod sınırı aşıldı! Maksimum 5000 karakter.' : 'Code limit exceeded! Max 5000 chars.')
                            : undefined
                        }
                      >
                        {codeSnippet.length}/{MAX_CODE_LENGTH}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Repo Selector Box */}
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

              {/* Bottom Buttons Bar */}
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

      {/* Post List */}
      <div className="divide-y divide-zinc-800/40">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-300">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {language === 'tr' ? 'Henüz Gönderi Yok' : 'No Posts Yet'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {language === 'tr'
                ? 'Bu kategoride veya akışta henüz bir gönderi bulunmuyor.'
                : 'No posts found in this category or feed.'}
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const postAuthorId = (post.author as any)?.id;
            const authorProfile =
              user &&
              ((postAuthorId && postAuthorId === user.id) ||
                post.author.username?.toLowerCase() === user.username?.toLowerCase())
                ? { ...post.author, ...user }
                : allUsers.find(
                    (u) =>
                      (u.id && postAuthorId && u.id === postAuthorId) ||
                      (u.username &&
                        u.username.toLowerCase() === post.author.username?.toLowerCase())
                  ) || post.author;

            const userKey = (user.username || user.id || '').toLowerCase();
            const isLiked = Boolean(
              (post.liked_by && post.liked_by.map((k) => k.toLowerCase()).includes(userKey)) ||
                post.is_liked
            );
            const isReposted = Boolean(
              (post.reposted_by && post.reposted_by.map((k) => k.toLowerCase()).includes(userKey)) ||
                post.is_reposted
            );
            const isBookmarked = Boolean(
              (post.bookmarked_by && post.bookmarked_by.map((k) => k.toLowerCase()).includes(userKey)) ||
                post.is_bookmarked ||
                user.saved_post_ids?.includes(post.id)
            );
            const likesCount =
              post.liked_by && post.liked_by.length > 0 ? post.liked_by.length : post.likes_count || 0;
            const repostsCount =
              post.reposted_by && post.reposted_by.length > 0
                ? post.reposted_by.length
                : post.reposts_count || 0;
            const commentsCount =
              post.comments && post.comments.length > 0 ? post.comments.length : post.comments_count || 0;

            const isPostAuthor =
              (authorProfile.username || '').toLowerCase() === (user.username || '').toLowerCase();
            const canDelete = isPostAuthor || isNylithra;

            const postCategoryObj = combinedCategoryList.find((c) => c.id === post.category);

            return (
              <article
                key={post.id}
                onContextMenu={(e) => handlePostContextMenu(e, post)}
                onTouchStart={(e) => handleTouchStart(e, post)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                className={`p-4 hover:bg-zinc-900/30 transition-colors space-y-3 relative select-text ${
                  isNylithra ? 'cursor-context-menu' : ''
                } ${longPressingPostId === post.id ? 'bg-zinc-900/50 scale-[0.995] transition-transform' : ''}`}
              >
                {/* Header */}
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
                        <span
                          className="text-[11px] text-zinc-500 font-mono"
                          title={post.created_at ? new Date(post.created_at).toLocaleString() : ''}
                        >
                          {formatTimeAgo(post.created_at || post.time_ago, language)}
                        </span>

                        {/* Category Badge */}
                        {post.category && (
                          <>
                            <span className="text-xs text-zinc-600">·</span>
                            <button
                              type="button"
                              onClick={() => setFeedCategoryFilter(post.category!)}
                              className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono flex items-center gap-1 cursor-pointer hover:bg-blue-500/20 transition-colors"
                            >
                              <span>{postCategoryObj?.icon || '🏷️'}</span>
                              <span>
                                {postCategoryObj?.name || post.category_name || post.category}
                              </span>
                            </button>
                          </>
                        )}

                        {post.community_name && (
                          <>
                            <span className="text-xs text-zinc-600">·</span>
                            <span
                              onClick={() => {
                                if (onSelectCommunity) {
                                  onSelectCommunity(post.community_handle || post.community_name!);
                                } else {
                                  onSelectUser(post.community_handle || post.community_name!);
                                }
                              }}
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

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPostToReport(post)}
                      title={language === 'tr' ? 'Gönderiyi Bildir' : 'Report Post'}
                      className="text-zinc-600 hover:text-amber-400 p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setPostToDelete(post)}
                        title={
                          isNylithra && !isPostAuthor
                            ? language === 'tr'
                              ? 'Yönetici Olarak Sil'
                              : 'Delete as Admin'
                            : language === 'tr'
                            ? 'Sil'
                            : 'Delete'
                        }
                        className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                {post.content && <p className="text-xs text-zinc-200 leading-relaxed">{post.content}</p>}

                {/* Media */}
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

                {/* Project Card */}
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
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span>{post.project_card.stars}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3 h-3 text-zinc-400" />
                        <span>{post.project_card.forks}</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Code Snippet */}
                {post.code_snippet && (
                  <CodeSnippetBlock
                    snippet={post.code_snippet}
                    language={language}
                    postAuthor={post.author.username}
                  />
                )}

                {/* Post Action Buttons */}
                <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-zinc-800/40 text-xs text-zinc-400">
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Comment */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveCommentPostId(
                          activeCommentPostId === post.id ? null : post.id
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                        activeCommentPostId === post.id
                          ? 'text-blue-400 bg-blue-500/10 font-semibold'
                          : 'text-zinc-400 hover:text-blue-400 hover:bg-zinc-800/40'
                      }`}
                      title={language === 'tr' ? 'Yorumlar' : 'Comments'}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="font-mono text-xs">{commentsCount}</span>
                    </button>

                    {/* Repost */}
                    <button
                      type="button"
                      onClick={() => onRepostPost(post.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                        isReposted
                          ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                          : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/40'
                      }`}
                      title={language === 'tr' ? 'Yeniden Paylaş' : 'Repost'}
                    >
                      <Repeat className="w-4 h-4" />
                      <span className="font-mono text-xs">{repostsCount}</span>
                    </button>

                    {/* Like */}
                    <button
                      type="button"
                      onClick={() => onLikePost(post.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                        isLiked
                          ? 'text-red-500 bg-red-500/10 font-bold'
                          : 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800/40'
                      }`}
                      title={language === 'tr' ? 'Beğen' : 'Like'}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 stroke-red-500' : ''}`} />
                      <span className="font-mono text-xs">{likesCount}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Bookmark */}
                    <button
                      type="button"
                      onClick={() => onBookmarkPost(post.id)}
                      className={`p-1.5 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer ${
                        isBookmarked
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/40'
                      }`}
                      title={
                        isBookmarked
                          ? language === 'tr'
                            ? 'Kaydedildi'
                            : 'Bookmarked'
                          : language === 'tr'
                          ? 'Kaydet'
                          : 'Save'
                      }
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                    </button>

                    {/* Share */}
                    <button
                      type="button"
                      onClick={() => handleShare(post)}
                      className={`p-1.5 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer ${
                        copiedPostId === post.id
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                      }`}
                      title={
                        copiedPostId === post.id
                          ? language === 'tr'
                            ? 'Bağlantı Kopyalandı'
                            : 'Link Copied'
                          : language === 'tr'
                          ? 'Paylaş'
                          : 'Share'
                      }
                    >
                      {copiedPostId === post.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Comment Section Dropdown */}
                {activeCommentPostId === post.id && (
                  <div className="pt-3 border-t border-zinc-800/40 space-y-3">
                    <form
                      onSubmit={(e) => handleCommentSubmit(post.id, e)}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={
                          language === 'tr'
                            ? 'Fikrini veya cevabını yaz...'
                            : 'Write your thoughts or reply...'
                        }
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{language === 'tr' ? 'Yanıtla' : 'Reply'}</span>
                      </button>
                    </form>

                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {post.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  onClick={() => onSelectUser(comment.author.username)}
                                  className="font-bold text-white hover:underline cursor-pointer"
                                >
                                  {comment.author.display_name}
                                </span>
                                <span className="text-zinc-500 font-mono text-[10px]">
                                  @{comment.author.username}
                                </span>
                              </div>
                              <span className="text-zinc-600 font-mono text-[10px]">
                                {formatTimeAgo(comment.created_at || 'Az önce', language)}
                              </span>
                            </div>
                            <p className="text-zinc-300 leading-relaxed">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Right-Click / Long-Press Context Menu */}
      {contextMenu.visible && contextMenu.post && (() => {
        const isPostAuthor =
          (contextMenu.post.author?.username || '').toLowerCase() === (user.username || '').toLowerCase();
        const canDelete = isPostAuthor || isNylithra;

        return (
          <div
            className="fixed z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-60 bg-[#121215]/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl shadow-2xl p-1.5 space-y-1">
              <div className="px-3 py-2 border-b border-zinc-800/60 flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  {isNylithra ? (
                    <>
                      <Shield className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-400">Admin Menüsü</span>
                    </>
                  ) : (
                    <>
                      <Code className="w-3.5 h-3.5 text-zinc-400" />
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
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
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
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:bg-zinc-800/80 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
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
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:bg-zinc-800/80 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {user.saved_post_ids?.includes(contextMenu.post.id)
                    ? language === 'tr'
                      ? 'Yer İşaretlerinden Kaldır'
                      : 'Remove Bookmark'
                    : language === 'tr'
                    ? 'Yer İşaretlerine Ekle'
                    : 'Save to Bookmarks'}
                </span>
              </button>

              {/* Report Post Button */}
              <button
                type="button"
                onClick={() => {
                  if (contextMenu.post) {
                    const target = contextMenu.post;
                    setContextMenu({ visible: false, x: 0, y: 0, post: null });
                    setPostToReport(target);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-amber-400 hover:bg-amber-500/15 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'tr' ? 'Gönderiyi Bildir' : 'Report Post'}</span>
              </button>

              {/* Delete Button */}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.post) {
                      const target = contextMenu.post;
                      setContextMenu({ visible: false, x: 0, y: 0, post: null });
                      setPostToDelete(target);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-500/15 transition-colors flex items-center gap-2.5 border-t border-zinc-800/80 mt-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>
                    {isNylithra && !isPostAuthor
                      ? language === 'tr'
                        ? 'Bu Gönderiyi Sil (Yönetici)'
                        : 'Delete Post (Admin)'
                      : language === 'tr'
                      ? 'Bu Gönderiyi Sil'
                      : 'Delete Post'}
                  </span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Report Post Modal */}
      {postToReport && (
        <ReportPostModal
          isOpen={Boolean(postToReport)}
          onClose={() => setPostToReport(null)}
          post={postToReport}
          currentUser={user}
          language={language}
          onSuccess={() => {
            setToastMessage(
              language === 'tr'
                ? 'Şikayetiniz yöneticiye iletildi. Teşekkürler!'
                : 'Report submitted to admin. Thank you!'
            );
            setTimeout(() => setToastMessage(null), 3000);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {postToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPostToDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#121215] border border-zinc-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {language === 'tr' ? 'Gönderiyi Sil' : 'Delete Post'}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">@{postToDelete.author?.username}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {language === 'tr'
                ? 'Bu gönderiyi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
                : 'Are you sure you want to permanently delete this post? This action cannot be undone.'}
            </p>

            {postToDelete.content && (
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-400 line-clamp-2 italic font-mono">
                "{postToDelete.content}"
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer border border-zinc-800"
              >
                {language === 'tr' ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = postToDelete.id;
                  onDeletePost(id);
                  setPostToDelete(null);
                  setToastMessage(language === 'tr' ? 'Gönderi silindi.' : 'Post deleted.');
                  setTimeout(() => setToastMessage(null), 2500);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs transition-all shadow-lg shadow-red-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'Kalıcı Olarak Sil' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
