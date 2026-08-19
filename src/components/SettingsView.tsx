import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { User, Globe, LogOut, CheckCircle2, Shield, Save, Sparkles, ChevronRight, ArrowLeft, Upload, AtSign, Smartphone, Download } from 'lucide-react';
import { validateFileSize, notifyFileSizeExceeded } from '../utils/fileUploadHelper';
import { isPWARunningStandalone } from '../utils/pwaHelper';

interface SettingsViewProps {
  user: UserProfile;
  language: 'tr' | 'en';
  onUpdateProfile: (updated: UserProfile) => void;
  onChangeLanguage: (lang: 'tr' | 'en') => void;
  onLogout: () => void;
  onOpenInstallPWA?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  language,
  onUpdateProfile,
  onChangeLanguage,
  onLogout,
  onOpenInstallPWA
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'main' | 'profile'>('main');
  const [formData, setFormData] = useState<UserProfile>(user);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(isPWARunningStandalone());
  }, []);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFileSize(file, user);
      if (!validation.isValid) {
        notifyFileSizeExceeded(validation);
        if (avatarInputRef.current) avatarInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFormData((prev) => ({ ...prev, avatar_url: ev.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFileSize(file, user);
      if (!validation.isValid) {
        notifyFileSizeExceeded(validation);
        if (bannerInputRef.current) bannerInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFormData((prev) => ({ ...prev, banner_url: ev.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = formData.username
      .replace(/^@/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '') || user.username;

    const updatedProfile = {
      ...formData,
      username: cleanUsername
    };

    onUpdateProfile(updatedProfile);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b]">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeSubTab === 'profile' && (
            <button
              onClick={() => setActiveSubTab('main')}
              className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h2 className="text-lg font-bold text-white tracking-tight">
            {activeSubTab === 'profile'
              ? (language === 'tr' ? 'Profil Bilgilerini Düzenle' : 'Edit Profile Details')
              : (language === 'tr' ? 'Ayarlar' : 'Settings')}
          </h2>
        </div>
      </div>

      <div className="p-6 w-full space-y-6">
        {activeSubTab === 'main' ? (
          <>
            <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-4 space-y-3">
              <button
                onClick={() => setActiveSubTab('profile')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/60 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-900/40">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {language === 'tr' ? 'Profil Bilgilerini Düzenle' : 'Edit Profile Information'}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono block">
                      {language === 'tr' ? 'Ad, fotoğraf, banner ve biyografi ayarları' : 'Name, avatar, banner, and bio settings'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            {/* PWA Mobile App Card */}
            {isStandalone ? (
              <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-5 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800/40 pb-3">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'tr' ? 'Mobil Uygulama (PWA)' : 'Mobile App (PWA)'}</span>
                </h3>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'tr' ? 'Uygulama Yüklü & Standalone Modunda Çalışıyor' : 'App Installed & Running in Standalone Mode'}</span>
                </div>
              </div>
            ) : onOpenInstallPWA ? (
              <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800/40 pb-3">
                  <Smartphone className="w-4 h-4 text-zinc-300" />
                  <span>{language === 'tr' ? 'Mobil Uygulama (PWA)' : 'Mobile App (PWA)'}</span>
                </h3>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {language === 'tr'
                    ? 'Code4Ever uygulamasını telefonunuza doğrudan indirin. Hızlı açılış, tam ekran deneyimi ve çevrimdışı önbellek desteği sağlar.'
                    : 'Install Code4Ever directly to your smartphone. Enjoy fast startup, full-screen experience and offline cache.'}
                </p>

                <button
                  onClick={onOpenInstallPWA}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-zinc-950 stroke-[2.5px]" />
                  <span>{language === 'tr' ? 'Telefona Nasıl İndirilir? (Rehber)' : 'How to Install on Phone (Guide)'}</span>
                </button>
              </div>
            ) : null}

            <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800/40 pb-3">
                <Globe className="w-4 h-4 text-zinc-300" />
                <span>{language === 'tr' ? 'Dil Tercihi' : 'Language Preference'}</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onChangeLanguage('tr')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    language === 'tr'
                      ? 'bg-zinc-800 border-zinc-600 text-white font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Türkçe (TR)</span>
                  {language === 'tr' && <Sparkles className="w-3.5 h-3.5 text-zinc-300" />}
                </button>

                <button
                  onClick={() => onChangeLanguage('en')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-zinc-800 border-zinc-600 text-white font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>English (US)</span>
                  {language === 'en' && <Sparkles className="w-3.5 h-3.5 text-zinc-300" />}
                </button>
              </div>
            </div>

            <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800/40 pb-3">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>{language === 'tr' ? 'Oturum & Güvenlik' : 'Session & Security'}</span>
              </h3>

              <div className="text-xs font-mono text-zinc-400 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'tr' ? 'Supabase Oturumu Aktif' : 'Supabase Session Active'}</span>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="w-full py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 text-red-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{language === 'tr' ? 'Oturumu Kapat' : 'Sign Out'}</span>
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span>{language === 'tr' ? 'Profil Bilgileri' : 'Profile Information'}</span>
              </h3>
              {savedSuccess && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{language === 'tr' ? 'Kaydedildi' : 'Saved'}</span>
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1 font-medium flex items-center justify-between">
                  <span>{language === 'tr' ? 'Kullanıcı Adı (@username)' : 'Username (@username)'}</span>
                  <span className="text-[10px] font-mono text-blue-400">@{formData.username}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 font-mono">@</span>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Görünen Ad' : 'Display Name'}
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Profil Fotoğrafı' : 'Avatar Image'}
                </label>
                <div className="flex gap-2 items-center">
                  <img
                    src={formData.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt="Avatar preview"
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-800 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none font-mono text-xs"
                  />
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-mono text-xs flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>{language === 'tr' ? 'Yükle' : 'Upload'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Banner Görseli' : 'Banner Image'}
                </label>
                <div className="flex gap-2 items-center">
                  <img
                    src={formData.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'}
                    alt="Banner preview"
                    className="w-12 h-8 rounded-lg object-cover ring-1 ring-zinc-800 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={formData.banner_url}
                    onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none font-mono text-xs"
                  />
                  <input
                    type="file"
                    ref={bannerInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                  />
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-mono text-xs flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>{language === 'tr' ? 'Yükle' : 'Upload'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Biyografi' : 'Bio'}
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  {language === 'tr' ? 'Konum' : 'Location'}
                </label>
                <input
                  type="text"
                  value={formData.custom_fields?.location || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      custom_fields: { ...formData.custom_fields, location: e.target.value }
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{language === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
