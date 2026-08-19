import React, { useState, useEffect } from 'react';
import {
  Home,
  Compass,
  Bell,
  Mail,
  Bot,
  Code2,
  Users,
  Briefcase,
  Bookmark,
  Settings,
  PlusCircle,
  Plus,
  LogOut,
  ChevronRight,
  Shield,
  Sparkles,
  Menu,
  X,
  User,
  Globe,
  Download,
  Smartphone
} from 'lucide-react';
import { UserProfile, DynamicTheme } from '../types';
import { verifyAdminAccess } from '../utils/securityHelper';
import { isPWARunningStandalone } from '../utils/pwaHelper';

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
  onChangeLanguage?: (lang: 'tr' | 'en') => void;
  onOpenInstallPWA?: () => void;
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
  onOpenBetaModal,
  onChangeLanguage,
  onOpenInstallPWA
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const hasAdminAccess = verifyAdminAccess(user);

  useEffect(() => {
    setIsStandalone(isPWARunningStandalone());
  }, []);

  const navItems = [
    { id: 'feed', label: language === 'tr' ? 'Ana Sayfa' : 'Home', icon: Home },
    { id: 'explore', label: language === 'tr' ? 'Keşfet' : 'Explore', icon: Compass },
    { id: 'jobs', label: language === 'tr' ? 'İş & Ekip İlanları' : 'Job & Team Listings', icon: Briefcase },
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
      isBetaModal: !hasAdminAccess,
      isBetaBadge: true
    },
    { id: 'projects', label: language === 'tr' ? 'Projeler' : 'Projects', icon: Code2 },
    { id: 'communities', label: language === 'tr' ? 'Topluluklar' : 'Communities', icon: Users },
    { id: 'bookmarks', label: language === 'tr' ? 'Yer İşaretleri' : 'Bookmarks', icon: Bookmark },
    { id: 'support', label: language === 'tr' ? 'Destek Ol' : 'Support Us', icon: Sparkles },
    { id: 'settings', label: language === 'tr' ? 'Ayarlar' : 'Settings', icon: Settings },
    ...(hasAdminAccess
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

  const handleNavClick = (id: string, isBetaModal?: boolean) => {
    if (isBetaModal) {
      onOpenBetaModal(id);
    } else {
      setActiveTab(id);
    }
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. MOBILE TOP HEADER (Screens < md)                      */}
      {/* ======================================================== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#09090b]/95 backdrop-blur-xl border-b border-zinc-800/80 px-4 py-2.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800/60 active:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div
            onClick={() => setActiveTab('feed')}
            className="cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-base font-extrabold text-white tracking-tight">Code4Ever</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* PWA Install Button on Mobile Header */}
          {!isStandalone && onOpenInstallPWA && (
            <button
              onClick={onOpenInstallPWA}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-200 active:scale-95 transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              aria-label="Install PWA App"
            >
              <Download className="w-3.5 h-3.5 text-zinc-300 stroke-[2.5px]" />
              <span>{language === 'tr' ? 'İndir' : 'App'}</span>
            </button>
          )}

          {/* Quick New Post Button */}
          <button
            onClick={onOpenNewPost}
            className="p-2 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white active:scale-95 transition-all shadow-sm font-bold flex items-center justify-center cursor-pointer"
            aria-label="New Post"
          >
            <Plus className="w-4 h-4 text-zinc-950 stroke-[2.5px]" />
          </button>

          {/* Quick Notifications Button */}
          <button
            onClick={() => setActiveTab('notifications')}
            className="relative p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800/60 active:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#09090b]" />
            )}
          </button>

          {/* User Profile Avatar */}
          <button
            onClick={() => setActiveTab('profile')}
            className="ring-1 ring-zinc-700/60 rounded-full overflow-hidden flex-shrink-0 cursor-pointer"
          >
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user.display_name}
              className="w-7 h-7 rounded-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MOBILE SLIDE-OUT DRAWER SHEET (Screens < md)           */}
      {/* ======================================================== */}
      {isMobileDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex animate-in fade-in duration-200 select-none"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="w-72 max-w-[80vw] h-full bg-[#09090b] border-r border-zinc-800/80 p-4 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-250 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                <span className="text-lg font-extrabold text-white tracking-tight">Code4Ever</span>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Card */}
              <div
                onClick={() => {
                  setActiveTab('profile');
                  setIsMobileDrawerOpen(false);
                }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#0c0c0e] border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-all"
              >
                <img
                  src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={user.display_name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-700/50 flex-shrink-0"
                />
                <div className="truncate flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white truncate">{user.display_name}</span>
                    {hasAdminAccess && (
                      <span className="px-1 py-0.2 rounded bg-zinc-800 text-[9px] text-zinc-400 font-mono">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono truncate block">@{user.username}</span>
                </div>
              </div>

              {/* PWA Download Banner Button inside Drawer */}
              {!isStandalone && onOpenInstallPWA && (
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenInstallPWA();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 hover:bg-zinc-800 active:scale-[0.98] transition-all cursor-pointer shadow-md"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-zinc-100 text-zinc-950 font-bold">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block">
                        {language === 'tr' ? 'Telefona Nasıl İndirilir?' : 'How to Install on Phone'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono block">
                        {language === 'tr' ? 'Kolay kurulum rehberi (PWA)' : 'PWA Setup guide'}
                      </span>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-zinc-300 stroke-[2.5px]" />
                </button>
              )}

              {/* Navigation Items */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id, item.isBetaModal)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                            isActive ? 'text-zinc-200' : 'text-zinc-400'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {(item.isBetaModal || item.isBetaBadge) && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 rounded shadow-sm">
                            BETA
                          </span>
                        )}
                        {item.badge !== undefined && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-zinc-100 text-zinc-950 rounded-full">
                            {item.badge}
                          </span>
                        )}
                        {item.isAdminBadge && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 rounded shadow-sm">
                            ADMIN
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile New Post Action */}
              <button
                onClick={() => {
                  onOpenNewPost();
                  setIsMobileDrawerOpen(false);
                }}
                className="w-full py-3 px-4 rounded-xl font-bold text-zinc-950 bg-zinc-100 hover:bg-white text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-zinc-950" />
                <span>{language === 'tr' ? 'Yeni Gönderi Paylaş' : 'Create New Post'}</span>
              </button>
            </div>

            {/* Bottom Actions inside Drawer */}
            <div className="pt-4 border-t border-zinc-800/60 space-y-2">
              {onChangeLanguage && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-zinc-400" />
                    <span>{language === 'tr' ? 'Dil' : 'Language'}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <button
                      onClick={() => onChangeLanguage('tr')}
                      className={`px-2 py-1 rounded-lg ${
                        language === 'tr' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500'
                      }`}
                    >
                      TR
                    </button>
                    <button
                      onClick={() => onChangeLanguage('en')}
                      className={`px-2 py-1 rounded-lg ${
                        language === 'en' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 active:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{language === 'tr' ? 'Çıkış Yap' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR (Screens < md)            */}
      {/* ======================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/95 backdrop-blur-xl border-t border-zinc-800/80 px-3 py-2 flex items-center justify-around select-none">
        {/* Home */}
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'feed' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'feed' ? 'stroke-[2.5px] text-white' : 'text-zinc-400'}`} />
          <span className="text-[10px] font-medium">{language === 'tr' ? 'Akış' : 'Home'}</span>
        </button>

        {/* Explore */}
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'explore' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Compass className={`w-5 h-5 ${activeTab === 'explore' ? 'stroke-[2.5px] text-white' : 'text-zinc-400'}`} />
          <span className="text-[10px] font-medium">{language === 'tr' ? 'Keşfet' : 'Explore'}</span>
        </button>

        {/* Center Floating Action Button (New Post) */}
        <button
          onClick={onOpenNewPost}
          className="flex items-center justify-center w-11 h-11 -mt-3 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 shadow-lg shadow-zinc-950/50 ring-4 ring-[#09090b] active:scale-95 transition-all cursor-pointer"
          aria-label="New Post"
        >
          <Plus className="w-5 h-5 text-zinc-950 stroke-[3px]" />
        </button>

        {/* Job Listings */}
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'jobs' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Briefcase className={`w-5 h-5 ${activeTab === 'jobs' ? 'stroke-[2.5px] text-white' : 'text-zinc-400'}`} />
          <span className="text-[10px] font-medium">{language === 'tr' ? 'İlanlar' : 'Jobs'}</span>
        </button>

        {/* Communities or Profile */}
        <button
          onClick={() => setActiveTab('communities')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'communities' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'communities' ? 'stroke-[2.5px] text-white' : 'text-zinc-400'}`} />
          <span className="text-[10px] font-medium">{language === 'tr' ? 'Topluluk' : 'Groups'}</span>
        </button>
      </nav>

      {/* ======================================================== */}
      {/* 4. DESKTOP PERMANENT SIDEBAR (Screens >= md)              */}
      {/* ======================================================== */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col justify-between h-screen sticky top-0 p-4 border-r border-zinc-800/60 bg-[#09090b]/95 backdrop-blur-md z-30 select-none">
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                        isActive ? 'text-zinc-200' : 'text-zinc-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(item.isBetaModal || item.isBetaBadge) && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 rounded shadow-sm">
                        BETA
                      </span>
                    )}
                    {item.badge !== undefined && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-zinc-100 text-zinc-950 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {item.isAdminBadge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 rounded shadow-sm">
                        ADMIN
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="pt-2 space-y-2">
            <button
              onClick={onOpenNewPost}
              className="w-full py-3 px-4 rounded-xl font-bold text-zinc-950 bg-zinc-100 hover:bg-white text-xs flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.98] shadow-lg cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-zinc-950" />
              <span>{language === 'tr' ? 'Yeni Gönderi' : 'New Post'}</span>
            </button>

            {!isStandalone && onOpenInstallPWA && (
              <button
                onClick={onOpenInstallPWA}
                className="w-full py-2 px-3 rounded-xl font-semibold text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                <span>{language === 'tr' ? 'Telefona İndir (PWA)' : 'Install App (PWA)'}</span>
              </button>
            )}
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
                  {hasAdminAccess && (
                    <span className="px-1 py-0.2 rounded bg-zinc-800 text-[9px] text-zinc-400 font-mono">
                      ADMIN
                    </span>
                  )}
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
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

