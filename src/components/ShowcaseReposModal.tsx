import React, { useState } from 'react';
import { X, GitBranch, Star, GitFork, Plus, Trash2, Check, Sparkles, AlertTriangle, ExternalLink } from 'lucide-react';
import { GitHubRepo, UserProfile } from '../types';
import { sanitizeText, sanitizeUrl } from '../utils/securityHelper';

interface ShowcaseReposModalProps {
  isOpen: boolean;
  user: UserProfile;
  pinnedRepos: GitHubRepo[];
  language: 'tr' | 'en';
  onClose: () => void;
  onSavePinnedRepos: (repos: GitHubRepo[]) => void;
}

const DEFAULT_SAMPLE_REPOS: GitHubRepo[] = [
  {
    id: 101,
    name: 'code4ever-core',
    full_name: 'developer/code4ever-core',
    description: 'Modern developer social network and open-source project collaboration engine.',
    html_url: 'https://github.com/developer/code4ever-core',
    stargazers_count: 142,
    forks_count: 38,
    language: 'TypeScript',
    updated_at: new Date().toISOString()
  },
  {
    id: 102,
    name: 'quantum-ai-toolkit',
    full_name: 'developer/quantum-ai-toolkit',
    description: 'High performance algorithmic toolkit for neural network state management.',
    html_url: 'https://github.com/developer/quantum-ai-toolkit',
    stargazers_count: 89,
    forks_count: 14,
    language: 'Rust',
    updated_at: new Date().toISOString()
  },
  {
    id: 103,
    name: 'react-fluent-charts',
    full_name: 'developer/react-fluent-charts',
    description: 'Lightweight, hardware-accelerated charting components built for React 19.',
    html_url: 'https://github.com/developer/react-fluent-charts',
    stargazers_count: 310,
    forks_count: 75,
    language: 'TypeScript',
    updated_at: new Date().toISOString()
  },
  {
    id: 104,
    name: 'zero-trust-auth-guard',
    full_name: 'developer/zero-trust-auth-guard',
    description: 'Client-side E2EE key distribution and zero-knowledge proof validator.',
    html_url: 'https://github.com/developer/zero-trust-auth-guard',
    stargazers_count: 67,
    forks_count: 12,
    language: 'Go',
    updated_at: new Date().toISOString()
  }
];

export const ShowcaseReposModal: React.FC<ShowcaseReposModalProps> = ({
  isOpen,
  user,
  pinnedRepos,
  language,
  onClose,
  onSavePinnedRepos
}) => {
  if (!isOpen) return null;

  const [selectedList, setSelectedList] = useState<GitHubRepo[]>(pinnedRepos || []);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customLang, setCustomLang] = useState('TypeScript');
  const [customUrl, setCustomUrl] = useState('');
  const [customStars, setCustomStars] = useState(0);
  const [customForks, setCustomForks] = useState(0);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isRepoPinned = (repoName: string) => {
    return selectedList.some((r) => r.name.toLowerCase() === repoName.toLowerCase());
  };

  const toggleRepo = (repo: GitHubRepo) => {
    setErrorMsg(null);
    if (isRepoPinned(repo.name)) {
      setSelectedList((prev) => prev.filter((r) => r.name.toLowerCase() !== repo.name.toLowerCase()));
    } else {
      if (selectedList.length >= 6) {
        setErrorMsg(
          language === 'tr'
            ? 'En fazla 6 adet depo sergileyebilirsiniz.'
            : 'You can showcase up to 6 repositories.'
        );
        return;
      }
      setSelectedList((prev) => [...prev, repo]);
    }
  };

  const handleAddCustomRepo = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customName.trim()) {
      setErrorMsg(language === 'tr' ? 'Depo adı zorunludur.' : 'Repository name is required.');
      return;
    }

    if (selectedList.length >= 6) {
      setErrorMsg(language === 'tr' ? 'En fazla 6 adet depo sergileyebilirsiniz.' : 'Max 6 repos allowed.');
      return;
    }

    const cleanName = sanitizeText(customName, 50);
    const newRepo: GitHubRepo = {
      id: Date.now(),
      name: cleanName,
      full_name: `${user.username}/${cleanName}`,
      description: customDesc ? sanitizeText(customDesc, 180) : 'Open source project',
      html_url: sanitizeUrl(customUrl) || `https://github.com/${user.username}/${cleanName}`,
      stargazers_count: Math.max(0, Number(customStars) || 0),
      forks_count: Math.max(0, Number(customForks) || 0),
      language: sanitizeText(customLang, 30) || 'Code',
      updated_at: new Date().toISOString()
    };

    setSelectedList((prev) => [...prev, newRepo]);
    setCustomName('');
    setCustomDesc('');
    setCustomUrl('');
    setCustomStars(0);
    setCustomForks(0);
    setShowAddCustom(false);
  };

  const handleSave = () => {
    onSavePinnedRepos(selectedList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#121215] border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{language === 'tr' ? 'Profilinde Depolarını Sergile' : 'Showcase Repositories'}</span>
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                  {selectedList.length}/6
                </span>
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                {language === 'tr'
                  ? 'Profil vitrininde öne çıkarmak istediğin depoları seç'
                  : 'Select repositories to pin to your public profile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Selected Repositories View */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-zinc-300 font-mono block">
            {language === 'tr' ? 'Öne Çıkarılan Depolar:' : 'Pinned Repositories:'}
          </label>

          {selectedList.length === 0 ? (
            <div className="p-6 bg-zinc-950/60 border border-dashed border-zinc-800 rounded-2xl text-center text-xs text-zinc-500 font-mono">
              {language === 'tr'
                ? 'Henüz vitrine eklenmiş bir depo yok. Aşağıdaki listeden seçin veya yeni ekleyin.'
                : 'No pinned repositories yet. Pick from below or add a custom one.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {selectedList.map((repo) => (
                <div
                  key={repo.name}
                  className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      <span className="text-xs font-bold text-white truncate">{repo.name}</span>
                      {repo.language && (
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-mono">
                          {repo.language}
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-[11px] text-zinc-400 truncate mt-1">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono mt-1.5">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span>{repo.stargazers_count}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3 h-3 text-zinc-400" />
                        <span>{repo.forks_count}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleRepo(repo)}
                    className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 transition-colors"
                    title={language === 'tr' ? 'Vitrinden Kaldır' : 'Remove from Showcase'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Suggested / Sample Repositories */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-300 font-mono block">
              {language === 'tr' ? 'Kullanılabilir Depolar:' : 'Available Repositories:'}
            </label>
            <button
              type="button"
              onClick={() => setShowAddCustom(!showAddCustom)}
              className="text-xs text-zinc-300 hover:text-white font-mono flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'tr' ? 'Özel Depo Ekle' : 'Add Custom Repo'}</span>
            </button>
          </div>

          {/* Custom Repo Addition Form */}
          {showAddCustom && (
            <form onSubmit={handleAddCustomRepo} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-white font-mono">
                {language === 'tr' ? 'Yeni Proje / Depo Bilgisi' : 'New Project / Repo Details'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={language === 'tr' ? 'Depo Adı (ör: my-awesome-app)' : 'Repo Name'}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  required
                />
                <input
                  type="text"
                  value={customLang}
                  onChange={(e) => setCustomLang(e.target.value)}
                  placeholder="Yazılım Dili (ör: TypeScript, Rust)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <input
                type="text"
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder={language === 'tr' ? 'Kısa açıklama...' : 'Short description...'}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <input
                  type="number"
                  min={0}
                  value={customStars}
                  onChange={(e) => setCustomStars(parseInt(e.target.value, 10) || 0)}
                  placeholder="Yıldız Sayısı"
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <input
                  type="number"
                  min={0}
                  value={customForks}
                  onChange={(e) => setCustomForks(parseInt(e.target.value, 10) || 0)}
                  placeholder="Fork Sayısı"
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs"
                >
                  {language === 'tr' ? 'Vazgeç' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs shadow-md"
                >
                  {language === 'tr' ? 'Vitrini Güncelle' : 'Add to Showcase'}
                </button>
              </div>
            </form>
          )}

          {/* Preset / Sample Repos to Pick */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {DEFAULT_SAMPLE_REPOS.map((repo) => {
              const isPinned = isRepoPinned(repo.name);
              return (
                <div
                  key={repo.name}
                  onClick={() => toggleRepo(repo)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    isPinned
                      ? 'bg-zinc-900/90 border-zinc-500 ring-1 ring-zinc-400'
                      : 'bg-zinc-950 hover:bg-zinc-900/60 border-zinc-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">{repo.name}</span>
                    {isPinned ? (
                      <span className="p-1 rounded-lg bg-zinc-100 text-zinc-950 flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="p-1 rounded-lg bg-zinc-900 text-zinc-500 border border-zinc-800 flex-shrink-0">
                        <Plus className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-1 mt-1">{repo.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-2">
                    <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-300">{repo.language}</span>
                    <span>★ {repo.stargazers_count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-colors"
          >
            {language === 'tr' ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition-all shadow-md active:scale-[0.98] flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-zinc-950" />
            <span>{language === 'tr' ? 'Vitrinimi Kaydet' : 'Save Showcase'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
