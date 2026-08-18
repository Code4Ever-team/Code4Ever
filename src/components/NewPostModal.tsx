import React, { useState, useRef } from 'react';
import { X, Code, Send, Image as ImageIcon, Video, Trash2, Loader2, Users } from 'lucide-react';
import { UserProfile, Community } from '../types';
import { validateFileSize, notifyFileSizeExceeded } from '../utils/fileUploadHelper';

interface NewPostModalProps {
  isOpen: boolean;
  user: UserProfile;
  communities?: Community[];
  language: 'tr' | 'en';
  onClose: () => void;
  onCreatePost: (
    content: string,
    codeSnippet?: { title: string; language: string; code: string },
    selectedRepo?: any,
    mediaUrl?: string,
    mediaType?: 'image' | 'video',
    communityId?: string,
    communityName?: string,
    communityHandle?: string
  ) => Promise<boolean> | boolean | void;
}

export const NewPostModal: React.FC<NewPostModalProps> = ({
  isOpen,
  user,
  communities = [],
  language,
  onClose,
  onCreatePost
}) => {
  const [content, setContent] = useState('');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [codeTitle, setCodeTitle] = useState('');
  const [codeLang, setCodeLang] = useState('TypeScript');
  const [codeSnippet, setCodeSnippet] = useState('');

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (15MB for normal users, 250MB for Spark supporters)
    const validation = validateFileSize(file, user);
    if (!validation.isValid) {
      notifyFileSizeExceeded(validation);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!content.trim() && !codeSnippet.trim() && !mediaUrl) return;

    setIsSubmitting(true);
    let attachedSnippet;
    if (showCode && codeSnippet.trim()) {
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
        undefined,
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
        setShowCode(false);
        setMediaUrl(null);
        setMediaType(null);
        setSelectedCommunityId(null);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#121215] border border-zinc-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-800"
            />
            <span className="text-sm font-bold text-white">
              {language === 'tr' ? 'Yeni Gönderi Paylaş' : 'Create New Post'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Community Selection */}
          <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs">
            <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>{language === 'tr' ? 'Paylaşım Alanı:' : 'Posting Scope:'}</span>
            </span>
            <select
              value={selectedCommunityId || ''}
              onChange={(e) => setSelectedCommunityId(e.target.value || null)}
              className="bg-zinc-900 border border-zinc-700/80 text-zinc-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none font-mono cursor-pointer"
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

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              language === 'tr'
                ? 'Neler yapıyorsun? #hashtag veya @kullanıcı etiketle...'
                : 'What are you working on? Add #hashtag or @mention...'
            }
            rows={4}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
          />

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

          {showCode && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codeTitle}
                  onChange={(e) => setCodeTitle(e.target.value)}
                  placeholder={language === 'tr' ? 'Kod Başlığı' : 'Snippet Title'}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none font-mono"
                />
                <select
                  value={codeLang}
                  onChange={(e) => setCodeLang(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none font-mono"
                >
                  <option value="TypeScript">TypeScript</option>
                  <option value="React">React</option>
                  <option value="Python">Python</option>
                  <option value="Rust">Rust</option>
                  <option value="Go">Go</option>
                </select>
              </div>
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="code snippet goes here..."
                rows={4}
                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none resize-none"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,video/*"
                className="hidden"
                onChange={handleMediaUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800"
              >
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <Video className="w-4 h-4 text-purple-400" />
                <span>{language === 'tr' ? 'Medya Ekle' : 'Add Media'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className={`text-xs font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors ${
                  showCode
                    ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Code className="w-4 h-4" />
                <span>{language === 'tr' ? 'Kod' : 'Code'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && !codeSnippet.trim() && !mediaUrl)}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-md disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === 'tr' ? 'Paylaşılıyor...' : 'Posting...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'tr' ? 'Paylaş' : 'Publish'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
