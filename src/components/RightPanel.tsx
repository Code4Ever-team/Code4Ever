import React from 'react';
import { Trend, Community, PlatformSettings } from '../types';
import { TrendingUp, Users, Check, UserPlus, Sparkles } from 'lucide-react';

interface RightPanelProps {
  trends: Trend[];
  communities: Community[];
  platformSettings?: PlatformSettings;
  language: 'tr' | 'en';
  onToggleJoinCommunity: (id: string) => void;
  onSelectCommunity?: (community: Community) => void;
  onSelectTrend?: (trend: Trend) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  trends,
  communities,
  platformSettings,
  language,
  onToggleJoinCommunity,
  onSelectCommunity,
  onSelectTrend
}) => {
  const brandTitle = platformSettings?.brandTitle || 'Code4Ever Platform';
  const brandDomain = platformSettings?.brandDomain || 'code4ever.ai.studio';

  return (
    <aside className="w-80 min-w-[320px] max-w-[320px] flex-shrink-0 hidden xl:block p-4 space-y-4 border-l border-zinc-800/60 bg-[#09090b]/95 h-screen sticky top-0 overflow-y-auto z-20 select-none">
      <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-800/40 pb-2.5">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            {language === 'tr' ? 'Trendler' : 'Trending'}
          </h3>
        </div>

        {trends.length === 0 ? (
          <div className="py-4 text-center text-zinc-500 text-xs font-mono">
            {language === 'tr' ? 'Henüz trend konu yok.' : 'No trending topics yet.'}
          </div>
        ) : (
          <div className="space-y-2">
            {trends.map((trend) => (
              <div
                key={trend.id}
                onClick={() => onSelectTrend && onSelectTrend(trend)}
                className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/40 hover:border-zinc-700 transition-all cursor-pointer space-y-0.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-blue-400 font-mono">
                    {trend.topic || trend.tag}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">{trend.category}</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  {trend.posts_count} {language === 'tr' ? 'gönderi' : 'posts'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-800/40 pb-2.5">
          <Users className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            {language === 'tr' ? 'Topluluklar' : 'Communities'}
          </h3>
        </div>

        {communities.length === 0 ? (
          <div className="py-4 text-center text-zinc-500 text-xs font-mono">
            {language === 'tr' ? 'Henüz topluluk oluşturulmadı.' : 'No communities created yet.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {communities.map((comm) => (
              <div
                key={comm.id}
                className="flex items-center justify-between gap-3 p-2 rounded-xl bg-zinc-950/40 hover:bg-zinc-900/60 transition-colors"
              >
                <div
                  onClick={() => onSelectCommunity && onSelectCommunity(comm)}
                  className="flex items-center gap-2.5 overflow-hidden cursor-pointer"
                >
                  <img
                    src={comm.avatar_url}
                    alt={comm.name}
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-zinc-800 flex-shrink-0"
                  />
                  <div className="truncate">
                    <span className="text-xs font-bold text-white truncate block hover:text-blue-400">
                      {comm.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono truncate block">
                      {comm.members_count} {language === 'tr' ? 'üye' : 'members'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onToggleJoinCommunity(comm.id)}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                    comm.is_joined
                      ? 'bg-zinc-800 text-emerald-400 border border-zinc-700/50'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                  title={comm.is_joined ? (language === 'tr' ? 'Katılındı' : 'Joined') : (language === 'tr' ? 'Katıl' : 'Join')}
                >
                  {comm.is_joined ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-zinc-950 border border-zinc-800/60 rounded-xl text-center space-y-1">
        <span className="text-[11px] font-mono text-zinc-400 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span>{brandTitle}</span>
        </span>
        <span className="text-[10px] text-zinc-500 font-mono block">{brandDomain}</span>
      </div>
    </aside>
  );
};
