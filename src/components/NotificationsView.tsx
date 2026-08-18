import React, { useState } from 'react';
import { Bell, Heart, Star, MessageSquare, Users, CheckCheck, Trash2 } from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  language: 'tr' | 'en';
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  language,
  onMarkAllAsRead,
  onClearNotifications
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.is_read : true));

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-400 fill-current" />;
      case 'star':
        return <Star className="w-4 h-4 text-amber-400 fill-current" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'community':
        return <Users className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b]">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-400" />
          <span>{language === 'tr' ? 'Bildirimler' : 'Notifications'}</span>
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllAsRead}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title={language === 'tr' ? 'Tümünü okundu işaretle' : 'Mark all as read'}
          >
            <CheckCheck className="w-4 h-4" />
          </button>
          <button
            onClick={onClearNotifications}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
            title={language === 'tr' ? 'Bildirimleri temizle' : 'Clear notifications'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-zinc-800/40 flex gap-2 bg-[#0c0c0e]">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          {language === 'tr' ? 'Tümü' : 'All'}
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === 'unread'
              ? 'bg-blue-600 text-white'
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
              className={`p-4 flex items-start gap-3.5 transition-colors ${
                !item.is_read ? 'bg-blue-950/20' : 'hover:bg-zinc-900/30'
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

                <p className="text-xs text-zinc-300 leading-relaxed">{item.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
