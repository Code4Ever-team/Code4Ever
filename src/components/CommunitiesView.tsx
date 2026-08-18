import React, { useState } from 'react';
import { Users, Plus, Check, UserPlus, AlertTriangle } from 'lucide-react';
import { Community, UserProfile } from '../types';

interface CommunitiesViewProps {
  communities: Community[];
  user?: UserProfile;
  language: 'tr' | 'en';
  onToggleJoin: (id: string) => void;
  onCreateCommunity: (newComm: { name: string; handle: string; description?: string; avatar_url: string }) => void;
}

export const CommunitiesView: React.FC<CommunitiesViewProps> = ({
  communities,
  user,
  language,
  onToggleJoin,
  onCreateCommunity
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      avatar_url: avatarUrl.trim() || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=100&auto=format&fit=crop&q=80'
    });

    setName('');
    setHandle('');
    setDescription('');
    setAvatarUrl('');
    setErrorMessage(null);
    setShowCreateModal(false);
  };

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b]">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <span>{language === 'tr' ? 'Topluluklar' : 'Communities'}</span>
        </h2>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'tr' ? 'Topluluk Oluştur' : 'Create Community'}</span>
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {communities.map((comm) => (
            <div
              key={comm.id}
              className="p-4 bg-[#0c0c0e] border border-zinc-800/50 rounded-2xl flex items-center justify-between gap-4 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <img
                  src={comm.avatar_url}
                  alt={comm.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-1 ring-zinc-800 flex-shrink-0"
                />
                <div className="truncate">
                  <h3 className="text-sm font-bold text-white truncate">{comm.name}</h3>
                  <span className="text-xs text-zinc-500 font-mono block truncate">{comm.handle}</span>
                  <span className="text-[11px] text-zinc-400 font-mono mt-0.5 block">
                    {comm.members_count.toLocaleString()} {language === 'tr' ? 'Üye' : 'Members'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onToggleJoin(comm.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                  comm.is_joined
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/50'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
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
          ))}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
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
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-semibold transition-colors"
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-md"
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
