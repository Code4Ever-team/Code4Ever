import React, { useState } from 'react';
import { Bell, Heart, Star, MessageSquare, Users, CheckCheck, Trash2, Briefcase, FileText } from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  language: 'tr' | 'en';
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onSelectTab?: (tab: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  language,
  onMarkAllAsRead,
  onClearNotifications,
  onSelectTab
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.is_read : true));

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'job_application':
      case 'job_listing':
        return <Briefcase className="w-4 h-4 text-zinc-200" />;
      case 'like':
        return <Heart className="w-4 h-4 text-red-400 fill-current" />;
      case 'star':
        return <Star className="w-4 h-4 text-amber-400 fill-current" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-zinc-300" />;
      case 'community':
        return <Users className="w-4 h-4 text-zinc-300" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-300" />;
    }
  };

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b]">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Bell className="w-5 h-5 text-zinc-300" />
          <span>{language === 'tr' ? 'Bildirimler' : 'Notifications'}</span>
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllAsRead}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={language === 'tr' ? 'Tümünü okundu işaretle' : 'Mark all as read'}
          >
            <CheckCheck className="w-4 h-4" />
          </button>
          <button
            onClick={onClearNotifications}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            title={language === 'tr' ? 'Bildirimleri temizle' : 'Clear notifications'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-zinc-800/40 flex gap-2 bg-[#0c0c0e]">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-zinc-100 text-zinc-950 font-bold shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          {language === 'tr' ? 'Tümü' : 'All'}
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === 'unread'
              ? 'bg-zinc-100 text-zinc-950 font-bold shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          {language === 'tr' ? 'Okunmamış' : 'Unread'}
        </button>
      </div>

      <div className="divide-y divide-zinc-800/40">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-zinc-500">
            {language === 'tr' ? 'Hiç bildirim yok.' : 'No notifications found.'}
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.type === 'job_application' && onSelectTab) {
                  onSelectTab('jobs');
                }
              }}
              className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                !item.is_read ? 'bg-zinc-900/50 border-l-2 border-zinc-400' : 'hover:bg-zinc-900/30'
              }`}
            >
              <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800/80 flex-shrink-0">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.actor.avatar_url}
                      alt={item.actor.display_name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="text-xs font-bold text-white">{item.actor.display_name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">@{item.actor.username}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">{item.time_ago}</span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{item.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
