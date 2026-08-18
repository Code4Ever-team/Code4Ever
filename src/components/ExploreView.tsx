import React, { useState } from 'react';
import { Search, TrendingUp, Code2, Users, ArrowUpRight } from 'lucide-react';
import { Post, Community, Trend } from '../types';

interface ExploreViewProps {
  posts: Post[];
  communities: Community[];
  trends: Trend[];
  language: 'tr' | 'en';
  onLikePost: (id: string) => void;
  onSelectCommunity: (id: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  posts,
  communities,
  trends,
  language,
  onSelectCommunity
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'posts' | 'communities'>('all');

  const filteredPosts = posts.filter((p) =>
    p.content.toLowerCase().includes(query.toLowerCase()) ||
    (p.code_snippet && p.code_snippet.code.toLowerCase().includes(query.toLowerCase())) ||
    p.author.username.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCommunities = communities.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.handle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b]">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              language === 'tr'
                ? 'Konu, etiket, gönderi veya topluluk ara...'
                : 'Search topic, tag, post or community...'
            }
            className="w-full bg-[#121215] border border-zinc-800/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {language === 'tr' ? 'Tümü' : 'All'}
          </button>
          <button
            onClick={() => setFilter('posts')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filter === 'posts'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {language === 'tr' ? 'Gönderiler' : 'Posts'}
          </button>
          <button
            onClick={() => setFilter('communities')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filter === 'communities'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {language === 'tr' ? 'Topluluklar' : 'Communities'}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {!query && (
          <div className="bg-[#0c0c0e] border border-zinc-800/50 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 border-b border-zinc-800/40 pb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>{language === 'tr' ? 'Popüler Konular' : 'Popular Topics'}</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {trends.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setQuery(t.tag)}
                  className="p-3 bg-zinc-950 border border-zinc-800/60 rounded-xl hover:border-zinc-700 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{t.tag}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {t.posts_count} {language === 'tr' ? 'gönderi' : 'posts'}
                    </span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {(filter === 'all' || filter === 'communities') && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>{language === 'tr' ? 'Topluluk Sonuçları' : 'Community Results'}</span>
            </h3>
            <div className="space-y-2">
              {filteredCommunities.map((comm) => (
                <div
                  key={comm.id}
                  onClick={() => onSelectCommunity(comm.id)}
                  className="p-3 bg-[#0c0c0e] border border-zinc-800/50 rounded-xl flex items-center justify-between hover:border-zinc-700 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={comm.avatar_url}
                      alt={comm.name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-800"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white">{comm.name}</h4>
                      <span className="text-[10px] text-zinc-500 font-mono">{comm.handle}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-1 rounded-lg">
                    {comm.members_count} {language === 'tr' ? 'üye' : 'members'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(filter === 'all' || filter === 'posts') && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-400" />
              <span>{language === 'tr' ? 'İlgili Gönderiler' : 'Related Posts'}</span>
            </h3>

            {filteredPosts.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono bg-[#0c0c0e] border border-zinc-800/40 rounded-2xl">
                {language === 'tr' ? 'Aramanıza uygun gönderi bulunamadı.' : 'No matching posts found.'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map((post) => (
                  <div key={post.id} className="p-4 bg-[#0c0c0e] border border-zinc-800/50 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={post.author.avatar_url}
                        alt={post.author.display_name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="text-xs font-bold text-white">{post.author.display_name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">@{post.author.username}</span>
                    </div>
                    <p className="text-xs text-zinc-300">{post.content}</p>
                    {post.media_url && (
                      <div className="rounded-xl overflow-hidden border border-zinc-800 bg-black max-h-60 mt-1">
                        {post.media_type === 'video' || post.media_url.startsWith('data:video') ? (
                          <video src={post.media_url} controls playsInline className="w-full max-h-60 object-contain" />
                        ) : (
                          <img src={post.media_url} alt="Post media" className="w-full max-h-60 object-cover" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
