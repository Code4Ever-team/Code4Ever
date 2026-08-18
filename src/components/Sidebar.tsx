import React from 'react';
import {
  Home,
  Compass,
  Bell,
  Mail,
  Bot,
  Code2,
  Users,
  Bookmark,
  Settings,
  PlusCircle,
  LogOut,
  ChevronRight,
  Shield,
  Crown,
  Sparkles,
  Heart
} from 'lucide-react';
import { UserProfile, DynamicTheme } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile;
  theme: DynamicTheme;
  language: 'tr' | 'en';
  unreadCount: number;
  onOpenNewPost: () => void;
  onLogout: () => void;
  onOpenBetaModal: (tabType?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  theme,
  language,
  unreadCount,
  onOpenNewPost,
  onLogout,
  onOpenBetaModal
}) => {
  const isNylithra =
    user?.username?.toLowerCase() === 'nylithra' ||
    user?.display_name?.toLowerCase() === 'nylithra';

  const navItems = [
    { id: 'feed', label: language === 'tr' ? 'Ana Sayfa' : 'Home', icon: Home },
    { id: 'explore', label: language === 'tr' ? 'Keşfet' : 'Explore', icon: Compass },
    {
      id: 'notifications',
      label: language === 'tr' ? 'Bildirimler' : 'Notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    {
      id: 'messages',
      label: language === 'tr' ? 'Mesajlar' : 'Messages',
      icon: Mail,
      isBetaModal: true
    },
    {
      id: 'everychat',
      label: 'EveryChat',
      icon: Bot,
      isBetaModal: !isNylithra,
      isBetaBadge: true
    },
    { id: 'projects', label: language === 'tr' ? 'Projeler' : 'Projects', icon: Code2 },
    { id: 'communities', label: language === 'tr' ? 'Topluluklar' : 'Communities', icon: Users },
    { id: 'bookmarks', label: language === 'tr' ? 'Yer İşaretleri' : 'Bookmarks', icon: Bookmark },
    { id: 'support', label: language === 'tr' ? 'Destek Ol' : 'Support Us', icon: Sparkles },
    { id: 'settings', label: language === 'tr' ? 'Ayarlar' : 'Settings', icon: Settings },
    ...(isNylithra
      ? [
          {
            id: 'admin',
            label: 'Admin Paneli',
            icon: Shield,
            isAdminBadge: true
          }
        ]
      : [])
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between h-screen sticky top-0 p-4 border-r border-zinc-800/60 bg-[#09090b]/95 backdrop-blur-md z-30 select-none">
      <div className="space-y-5">
        <div className="px-2 pt-2 pb-1">
          <div className="cursor-pointer transition-opacity hover:opacity-90" onClick={() => setActiveTab('feed')}>
            <span className="text-xl font-extrabold text-white tracking-tight">Code4Ever</span>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isBetaModal) {
                    onOpenBetaModal(item.id);
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'text-white bg-zinc-800/90 shadow-sm border border-zinc-700/50'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                }`}
                style={
                  isActive
                    ? {
                        borderLeftColor: theme.accentColor,
                        borderLeftWidth: '3px'
                      }
                    : {}
                }
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-blue-400' : 'text-zinc-400'
                    }`}
                    style={isActive ? { color: theme.accentColor } : {}}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {(item.isBetaModal || item.isBetaBadge) && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono bg-blue-600/90 text-white rounded shadow-sm">
                      BETA
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-600 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        <div className="pt-2">
          <button
            onClick={onOpenNewPost}
            className="w-full py-3 px-4 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.98] shadow-lg shadow-blue-600/20"
            style={{
              backgroundColor: theme.accentColor
            }}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'tr' ? 'Yeni Gönderi' : 'New Post'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div
          onClick={() => setActiveTab('profile')}
          className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0c0c0e] hover:bg-zinc-800/80 border border-zinc-800/80 cursor-pointer transition-all hover:border-zinc-700"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user.display_name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-zinc-700/50 flex-shrink-0"
            />
            <div className="truncate">
              <div className="flex items-center gap-1 truncate">
                <span className="text-xs font-bold text-white truncate">{user.display_name}</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono truncate block">@{user.username}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              title={language === 'tr' ? 'Çıkış Yap' : 'Sign Out'}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </div>
        </div>
      </div>
    </aside>
  );
};
