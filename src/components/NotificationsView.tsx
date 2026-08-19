import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Heart,
  Star,
  MessageSquare,
  Users,
  CheckCheck,
  Trash2,
  Briefcase,
  Volume2,
  Sparkles,
  Smartphone,
  Laptop
} from 'lucide-react';
import { NotificationItem } from '../types';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendNativeNotification,
  playNotificationSound
} from '../utils/notificationSound';

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
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      sendNativeNotification({
        title: 'Code4Ever Bildirimleri Aktif! 🔔',
        body: language === 'tr'
          ? 'Telefonunuza ve bilgisayarınıza gelen bildirimler artık sesli olarak iletilecektir.'
          : 'Notifications on your phone and PC are now active with sound.',
        playSound: true
      });
    }
  };

  const handleTestSoundAndNotification = () => {
    setIsTesting(true);
    sendNativeNotification({
      title: 'Code4Ever - Test Bildirimi 💬',
      body: language === 'tr'
        ? 'Ahmet sana bir yanıt gönderdi: "Harika proje! 🚀"'
        : 'Alex sent you a reply: "Awesome project! 🚀"',
      playSound: true
    });
    setTimeout(() => setIsTesting(false), 800);
  };

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
      {/* Sticky Header */}
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

      {/* Native System & Sound Notification Banner */}
      <div className="p-4 border-b border-zinc-800/60 bg-gradient-to-r from-zinc-950 via-[#0c0c0e] to-zinc-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200 flex-shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white tracking-tight">
                  {language === 'tr' ? 'Masaüstü & Telefon Bildirimleri' : 'Desktop & Mobile Notifications'}
                </h4>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-emerald-400 border border-zinc-700">
                  {language === 'tr' ? 'Sesli (WhatsApp Tarzı)' : 'With Sound'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {permission === 'granted'
                  ? (language === 'tr' ? 'Sistem bildirimleri ve bildirim sesi aktif.' : 'System notifications & sound are active.')
                  : (language === 'tr' ? 'Site kapalıyken veya arkadayken telefon ve bilgisayarınıza bildirim gelsin.' : 'Receive push notifications on phone & PC when in background.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {permission !== 'granted' ? (
              <button
                onClick={handleEnableNotifications}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-zinc-950 fill-zinc-950" />
                <span>{language === 'tr' ? 'Bildirimleri Aç' : 'Enable Notifications'}</span>
              </button>
            ) : (
              <button
                onClick={handleTestSoundAndNotification}
                disabled={isTesting}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
                <span>{language === 'tr' ? 'Sesi & Bildirimi Test Et' : 'Test Sound & Alert'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
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

      {/* Notification List */}
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
                item.is_read ? 'bg-[#09090b] hover:bg-zinc-900/30' : 'bg-zinc-900/40 hover:bg-zinc-900/60'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex-shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs text-zinc-200 leading-snug">
                  {item.actor_username && (
                    <span className="font-bold text-white mr-1.5">
                      @{item.actor_username}
                    </span>
                  )}
                  <span>{item.content}</span>
                </p>
                <span className="text-[10px] font-mono text-zinc-400 block">
                  {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Şimdi'}
                </span>
              </div>

              {!item.is_read && (
                <div className="w-2 h-2 rounded-full bg-zinc-100 flex-shrink-0 mt-2" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
