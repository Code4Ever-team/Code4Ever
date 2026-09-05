import React, { useState } from 'react';
import { Users, Plus, Check, UserPlus, AlertTriangle, Settings, Shield, Crown, Code2, Terminal, Share2, Link2 } from 'lucide-react';
import { Community, UserProfile } from '../types';
import { verifyAdminAccess } from '../utils/securityHelper';
import { CommunitySettingsModal } from './CommunitySettingsModal';
import { CommunityApiModal } from './CommunityApiModal';

interface CommunitiesViewProps {
  communities: Community[];
  user?: UserProfile;
  allUsers?: UserProfile[];
  language: 'tr' | 'en';
  onToggleJoin: (id: string) => void;
  onCreateCommunity: (newComm: { name: string; handle: string; description?: string; avatar_url: string; banner_url?: string }) => void;
  onUpdateCommunity?: (updated: Community) => void;
  onDeleteCommunity?: (communityId: string) => void;
  onSelectCommunity?: (comm: Community) => void;
}

export const CommunitiesView: React.FC<CommunitiesViewProps> = ({
  communities,
  user,
  allUsers = [],
  language,
  onToggleJoin,
  onCreateCommunity,
  onUpdateCommunity,
  onDeleteCommunity,
  onSelectCommunity
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [apiCommunity, setApiCommunity] = useState<Community | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingJoinIds, setPendingJoinIds] = useState<Set<string>>(new Set());

  const handleCopyLink = (e: React.MouseEvent, comm: Community) => {
    e.stopPropagation();
    const cleanHandle = (comm.handle || '').replace(/^@/, '').trim().toLowerCase();
    const fullUrl = `${window.location.origin}/c/@${cleanHandle}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(comm.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleJoinClick = (commId: string) => {
    if (pendingJoinIds.has(commId)) return;
    setPendingJoinIds((prev) => new Set(prev).add(commId));
    setTimeout(() => {
      setPendingJoinIds((prev) => {
        const next = new Set(prev);
        next.delete(commId);
        return next;
      });
    }, 500);
    onToggleJoin(commId);
  };

  const hasAdminAccess = verifyAdminAccess(user);

  const canManageCommunity = (comm: Community): boolean => {
    if (!user) return false;
    if (hasAdminAccess) return true;
    if (comm.created_by && comm.created_by === user.id) return true;
    if (comm.creator_username && comm.creator_username.toLowerCase() === (user.username || '').toLowerCase()) return true;
    return false;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!name.trim()) return;

    const rawHandle = handle.replace(/^@/, '').trim().toLowerCase() || name.toLowerCase().replace(/\s+/g, '_');
    const formattedHandle = `@${rawHandle}`;

    // 1. Check if handle or name conflicts with current user's username
    if (user && user.username.toLowerCase() === rawHandle) {
      setErrorMessage(
        language === 'tr'
          ? `⚠️ "${formattedHandle}" bir kullanıcı adı olarak kullanılıyor! Lütfen başka bir topluluk adı seçin.`
          : `⚠️ "${formattedHandle}" is already taken by a username! Please choose another name.`
      );
      return;
    }

    // 2. Check if handle or name conflicts with existing communities
    const isConflict = communities.some(
      (c) =>
        c.handle.replace(/^@/, '').toLowerCase() === rawHandle ||
        c.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (isConflict) {
      setErrorMessage(
        language === 'tr'
          ? `⚠️ "${formattedHandle}" veya "${name}" adında bir topluluk zaten mevcut! Başka bir isim girin.`
          : `⚠️ A community named "${formattedHandle}" already exists! Please choose a different name.`
      );
      return;
    }

    onCreateCommunity({
      name: name.trim(),
      handle: formattedHandle,
      description: description.trim(),
      avatar_url: avatarUrl.trim() || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=100&auto=format&fit=crop&q=80',
      banner_url: bannerUrl.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'
    });

    setName('');
    setHandle('');
    setDescription('');
    setAvatarUrl('');
    setBannerUrl('');
    setErrorMessage(null);
    setShowCreateModal(false);
  };

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b]">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-zinc-300" />
          <span>{language === 'tr' ? 'Topluluklar' : 'Communities'}</span>
        </h2>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-zinc-950" />
          <span>{language === 'tr' ? 'Topluluk Oluştur' : 'Create Community'}</span>
        </button>
      </div>

      <div className="p-5 space-y-4">
        {communities.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs font-mono bg-[#0c0c0e] rounded-2xl border border-zinc-800/40">
            {language === 'tr' ? 'Henüz hiçbir topluluk oluşturulmamış.' : 'No communities created yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {communities.map((comm) => {
              const hasManagePerm = canManageCommunity(comm);
              return (
                <div
                  key={comm.id}
                  className="overflow-hidden bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl hover:border-zinc-700 transition-all group shadow-sm flex flex-col"
                >
                  {/* Subtle Community Banner Strip if available */}
                  {comm.banner_url && (
                    <div className="h-16 sm:h-14 w-full overflow-hidden relative bg-zinc-900 cursor-pointer" onClick={() => onSelectCommunity && onSelectCommunity(comm)}>
                      <img
                        src={comm.banner_url}
                        alt={comm.name}
                        className="w-full h-full object-cover opacity-45 group-hover:opacity-65 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/50 to-transparent" />
                    </div>
                  )}

                  <div className={`p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${comm.banner_url ? '-mt-7 sm:-mt-6 relative z-10' : ''}`}>
                    {/* Community Avatar & Info */}
                    <div
                      onClick={() => onSelectCommunity && onSelectCommunity(comm)}
                      className="flex items-start sm:items-center gap-3.5 sm:gap-4 overflow-hidden cursor-pointer flex-1 min-w-0"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={comm.avatar_url}
                          alt={comm.name}
                          className="w-20 h-20 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-zinc-800 shadow-xl group-hover:scale-105 transition-transform bg-zinc-900"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-purple-600/95 text-white p-1 rounded-lg border-2 border-[#0c0c0e] shadow-md">
                          <Users className="w-3 h-3" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                            {comm.name}
                          </h3>
                          {comm.created_by === user?.id && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-mono flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5 text-amber-400" />
                              {language === 'tr' ? 'Kurucu' : 'Founder'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-purple-400 font-mono font-medium truncate">
                            /c/@{comm.handle.replace(/^@/, '')}
                          </span>
                          <span className="text-zinc-600 text-xs hidden sm:inline">•</span>
                          <span className="text-[11px] sm:text-xs text-zinc-400 font-mono flex items-center gap-1">
                            <Users className="w-3 h-3 text-zinc-500" />
                            {comm.members_count.toLocaleString()} {language === 'tr' ? 'Üye' : 'Members'}
                          </span>
                        </div>

                        {comm.description && (
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1.5 max-w-xl leading-relaxed">
                            {comm.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Community Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center pt-3 sm:pt-0 border-t border-zinc-800/40 sm:border-t-0 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(e, comm)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-mono ${
                          copiedId === comm.id
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/60 shadow-md'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border-zinc-800'
                        }`}
                        title={copiedId === comm.id ? (language === 'tr' ? 'Bağlantı kopyalandı!' : 'Link copied!') : (language === 'tr' ? 'Topluluk Linkini Kopyala (/c/@name)' : 'Copy Community Link (/c/@name)')}
                      >
                        {copiedId === comm.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setApiCommunity(comm)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-950/30 text-amber-400 hover:text-amber-300 hover:bg-amber-900/40 border border-amber-800/40 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
                        title={language === 'tr' ? 'Topluluk HTTP API (Beta - Yakında)' : 'Community HTTP API (Beta - Coming Soon)'}
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span className="font-bold">API</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-bold uppercase tracking-wider">
                          BETA
                        </span>
                      </button>

                      {hasManagePerm && (
                        <button
                          type="button"
                          onClick={() => setEditingCommunity(comm)}
                          className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                          title={language === 'tr' ? 'Topluluk Ayarları' : 'Community Settings'}
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={pendingJoinIds.has(comm.id)}
                        onClick={() => handleJoinClick(comm.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 ${
                          comm.is_joined
                            ? 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                            : 'bg-zinc-100 hover:bg-white text-zinc-950 shadow-md'
                        }`}
                      >
                        {comm.is_joined ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{language === 'tr' ? 'Katılındı' : 'Joined'}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{language === 'tr' ? 'Katıl' : 'Join'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Community API Modal */}
      {apiCommunity && (
        <CommunityApiModal
          isOpen={!!apiCommunity}
          community={apiCommunity}
          currentUser={user}
          language={language}
          onClose={() => setApiCommunity(null)}
        />
      )}

      {/* Community Settings Modal */}
      {editingCommunity && (
        <CommunitySettingsModal
          isOpen={!!editingCommunity}
          community={editingCommunity}
          currentUser={user || { id: '', username: '', display_name: '', avatar_url: '', banner_url: '', bio: '', role: 'user' }}
          language={language}
          allUsers={allUsers}
          onClose={() => setEditingCommunity(null)}
          onUpdateCommunity={(communityId, updatedData) => {
            const updated: Community = {
              ...editingCommunity,
              ...updatedData,
              updated_at: new Date().toISOString()
            };
            if (onUpdateCommunity) onUpdateCommunity(updated);
            setEditingCommunity(null);
          }}
          onDeleteCommunity={(commId) => {
            if (onDeleteCommunity) onDeleteCommunity(commId);
            setEditingCommunity(null);
          }}
          onTransferOwnership={(commId, newOwnerUsername, newOwnerId) => {
            const updated: Community = {
              ...editingCommunity,
              creator_username: newOwnerUsername,
              created_by: newOwnerId || editingCommunity.created_by,
              updated_at: new Date().toISOString()
            };
            if (onUpdateCommunity) onUpdateCommunity(updated);
            setEditingCommunity(null);
          }}
        />
      )}

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {language === 'tr' ? 'Yeni Topluluk Oluştur' : 'Create New Community'}
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-mono text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Topluluk Adı' : 'Community Name'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ör. Rust Developers TR"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Kullanıcı Adı / Handle' : 'Handle'}
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@rust_tr"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Avatar Görsel URL' : 'Avatar Image URL'}
                </label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Açıklama' : 'Description'}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold transition-colors shadow-md cursor-pointer"
                >
                  {language === 'tr' ? 'Oluştur' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
