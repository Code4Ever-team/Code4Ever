import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Sparkles, Send, LogOut, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface ClosedBetaScreenProps {
  user: UserProfile;
  language: 'tr' | 'en';
  onUpdateContact: (contact: string) => void;
  onLogout: () => void;
}

export const ClosedBetaScreen: React.FC<ClosedBetaScreenProps> = ({
  user,
  language,
  onUpdateContact,
  onLogout
}) => {
  const [contact, setContact] = useState(user.betaContact || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    onUpdateContact(contact.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const isRejected = user.betaStatus === 'rejected';

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-white flex flex-col items-center justify-center p-4 relative font-sans selection:bg-blue-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-emerald-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg bg-[#0c0c0e] border border-zinc-800/80 rounded-3xl p-8 shadow-2xl space-y-6 text-center backdrop-blur-xl">
        {/* Logo & Header */}
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-emerald-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 shadow-xl shadow-blue-500/10">
            <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight pt-2">
            Code4Ever Kapalı Beta
          </h1>
          <p className="text-xs text-emerald-400 font-mono font-semibold flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{isRejected ? 'Başvuru Durumu: Reddedildi' : 'Başvuru Durumu: İncelemede'}</span>
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl text-left space-y-3">
          <p className="text-xs text-zinc-300 leading-relaxed font-medium">
            Kapalı Betaya Başvurduğunuz İçin Teşekkürler Başvurunuz Onaylandığında Sizlere Ulaşabilmemiz İçin Bir Sosyal Medya Adresi Bırakınız:
          </p>
          <p className="text-[11px] text-zinc-400 font-mono italic">
            ör: insta: nylithra
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 font-mono block">
              Sosyal Medya / İletişim Bilginiz:
            </label>
            <div className="relative">
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="ör: insta: nylithra veya @kullanici_adi"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>İletişim Bilgisini Kaydet / Güncelle</span>
          </button>
        </form>

        {savedSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>İletişim adresiniz kaydedildi! Admin onayının ardından erişiminiz açılacaktır.</span>
          </div>
        )}

        {/* Footer Notice */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="w-6 h-6 rounded-full object-cover ring-1 ring-zinc-700"
            />
            <span className="font-mono text-white text-[11px]">@{user.username}</span>
          </div>

          <button
            onClick={onLogout}
            className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>
    </div>
  );
};
