import React, { useState, useEffect } from 'react';
import {
  Code2,
  Star,
  GitFork,
  ExternalLink,
  RefreshCw,
  Github,
  Search
} from 'lucide-react';
import { UserProfile, GitHubRepo } from '../types';

interface ProjectsViewProps {
  user: UserProfile;
  language: 'tr' | 'en';
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ user, language }) => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchUserRepos = async (targetUsername: string) => {
    if (!targetUsername) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.github.com/users/${targetUsername}/repos?sort=updated&per_page=30`);
      if (!res.ok) {
        throw new Error(language === 'tr' ? 'GitHub depoları alınamadı.' : 'Failed to fetch GitHub repositories.');
      }
      const data = await res.json();
      setRepos(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching repos';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRepos(user.username);
  }, [user.username]);

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (repo.language && repo.language.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b]">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Code2 className="w-5 h-5 text-blue-400" />
          <span>{language === 'tr' ? 'GitHub Depoları' : 'GitHub Repositories'}</span>
        </h2>

        <button
          onClick={() => fetchUserRepos(user.username)}
          disabled={loading}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title={language === 'tr' ? 'Yenile' : 'Refresh'}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'tr'
                  ? 'Depo adı, dil veya açıklama ara...'
                  : 'Search repo name, language or description...'
              }
              className="w-full bg-[#121215] border border-zinc-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Github className="w-3.5 h-3.5 text-zinc-300" />
            <span>@{user.username} {language === 'tr' ? 'depoları' : 'repositories'}</span>
          </span>
          <span>{filteredRepos.length} {language === 'tr' ? 'depo bulundu' : 'repos found'}</span>
        </div>

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-2xl text-xs text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-zinc-500 text-xs font-mono animate-pulse">
            {language === 'tr' ? 'GitHub depoları yükleniyor...' : 'Loading GitHub repositories...'}
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs font-mono bg-[#0c0c0e] border border-zinc-800/40 rounded-2xl p-6">
            {language === 'tr' ? 'Henüz gösterilecek depo bulunamadı.' : 'No repositories found.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredRepos.map((repo) => (
              <div
                key={repo.id}
                className="p-4 bg-[#0c0c0e] border border-zinc-800/50 rounded-2xl hover:border-zinc-700 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-white hover:text-blue-400 hover:underline flex items-center gap-1.5"
                    >
                      <span>{repo.name}</span>
                    </a>
                    {repo.description && (
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                  </div>

                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40 text-xs font-mono">
                  <div className="flex items-center gap-4">
                    {repo.language && (
                      <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Star className="w-3.5 h-3.5 text-amber-400" /> {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <GitFork className="w-3.5 h-3.5" /> {repo.forks_count}
                    </span>
                  </div>

                  <span className="text-[10px] text-zinc-500">
                    {new Date(repo.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
