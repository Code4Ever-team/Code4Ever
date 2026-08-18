import React, { useState } from 'react';
import { Github, Shield, Sparkles, Code2, GitFork, MessageSquare, Zap } from 'lucide-react';
import { UserProfile } from '../types';
import { signInWithGitHubProvider, saveStoredProfile, DEFAULT_USER } from '../services/firebaseClient';

interface AuthScreenProps {
  language: 'tr' | 'en';
  onChangeLanguage?: (lang: 'tr' | 'en') => void;
  isClosedBetaActive?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ language, onChangeLanguage, isClosedBetaActive = false }) => {
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGitHubOAuth = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithGitHubProvider();
    } catch (err: any) {
      console.warn('Firebase GitHub OAuth attempt:', err);
      if (err?.code === 'auth/internal-error' || err?.code === 'auth/popup-blocked') {
        setAuthError(
          language === 'tr'
            ? 'Tarayıcı veya pencere kısıtlaması nedeniyle yönlendirme bekleniyor...'
            : 'Redirecting to GitHub auth provider...'
        );
      } else {
        setAuthError(err?.message || 'Giriş sırasında bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    if (isClosedBetaActive) {
      setAuthError(
        language === 'tr'
          ? 'Kapalı beta aktif olduğu için misafir girişi engellenmiştir.'
          : 'Guest login is disabled during closed beta.'
      );
      return;
    }
    setDemoLoading(true);
    setTimeout(() => {
      const demoUser: UserProfile = {
        ...DEFAULT_USER,
        id: `usr_${Date.now()}`,
        username: 'c4e_developer',
        display_name: 'C4E Developer',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        bio: language === 'tr' ? 'Code4Ever topluluk üyesi ve açık kaynak tutkunu.' : 'Code4Ever community member and open-source enthusiast.',
        role: language === 'tr' ? 'Geliştirici' : 'Developer',
        verified: false,
        betaStatus: 'pending' as const,
        custom_fields: {
          github: 'github.com/code4ever',
          location: 'Türkiye'
        }
      };
      saveStoredProfile(demoUser);
      window.location.reload();
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden font-sans">
      {/* Glowing background ambient lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-zinc-700/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-zinc-800/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Language switcher top right */}
      {onChangeLanguage && (
        <div className="absolute top-6 right-6 z-20 flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 p-1 rounded-2xl backdrop-blur-md">
          <button
            onClick={() => onChangeLanguage('tr')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              language === 'tr' ? 'bg-zinc-100 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            TR
          </button>
          <button
            onClick={() => onChangeLanguage('en')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              language === 'en' ? 'bg-zinc-100 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            EN
          </button>
        </div>
      )}

      <div className="w-full max-w-lg space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold backdrop-blur-md mb-2">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400 animate-pulse" />
            <span>{language === 'tr' ? 'Geliştirici Ekosistemi' : 'Developer Ecosystem'}</span>
          </div>

          <div className="flex justify-center">
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Code4Ever</h1>
          </div>

          <p className="text-sm text-zinc-400 font-medium max-w-sm mx-auto leading-relaxed">
            {language === 'tr'
              ? 'Yazılımcılar için sosyal akış ve kod paylaşımı'
              : 'Social feed and code sharing for developers'}
          </p>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-[#121215]/80 border border-zinc-800/60 backdrop-blur-md flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">{language === 'tr' ? 'Kod Paylaşımı' : 'Code Snippets'}</h4>
              <p className="text-[10px] text-zinc-500 font-mono">{language === 'tr' ? 'Github Depolarınızı Herkesle Paylaşın' : 'Share your GitHub repositories with everyone.'}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#121215]/80 border border-zinc-800/60 backdrop-blur-md flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">{language === 'tr' ? 'Bağlantı' : 'Connect'}</h4>
              <p className="text-[10px] text-zinc-500 font-mono">{language === 'tr' ? 'Diğer Geliştiriciler İle Bağlantı Kurun' : 'Connect with other developers.'}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#121215]/80 border border-zinc-800/60 backdrop-blur-md flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">{language === 'tr' ? 'Topluluklar' : 'Communities'}</h4>
              <p className="text-[10px] text-zinc-500 font-mono">{language === 'tr' ? 'Uzmanlık Alanınız Olan Topluluklara Katılın' : 'Join Communities in Your Area of ​​Expertise'}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#121215]/80 border border-zinc-800/60 backdrop-blur-md flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">{language === 'tr' ? 'Canlı Akış' : 'Live Feed'}</h4>
              <p className="text-[10px] text-zinc-500 font-mono">{language === 'tr' ? 'Dünyadaki Her Yazılımcı İle Etkileşime Geç' : 'Interact with every software developer in the world.'}</p>
            </div>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="bg-[#121215]/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-5 backdrop-blur-2xl relative">
          {authError && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed font-sans">
              {authError}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleGitHubOAuth}
              disabled={loading || demoLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-xl active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Github className="w-5 h-5" />
              <span>
                {loading
                  ? (language === 'tr' ? 'GitHub Yönlendiriliyor...' : 'Redirecting...')
                  : (language === 'tr' ? 'GitHub ile Giriş Yap' : 'Sign in with GitHub')}
              </span>
            </button>

            {isClosedBetaActive ? (
              <div className="w-full py-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-xs text-center flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {language === 'tr'
                    ? 'Kapalı beta aktif - Misafir girişi kapalıdır'
                    : 'Closed beta active - Guest login disabled'}
                </span>
              </div>
            ) : (
              <button
                onClick={handleDemoLogin}
                disabled={loading || demoLoading}
                className="w-full py-3 px-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {demoLoading
                    ? (language === 'tr' ? 'Hazırlanıyor...' : 'Preparing...')
                    : (language === 'tr' ? 'Misafir Hesabı ile Devam Et' : 'Continue as Guest')}
                </span>
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-800/60 space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 font-mono">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Gelişmiş Koruma Sistemi</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono leading-relaxed">
              {language === 'tr'
                ? 'Giriş yaptığınızda GitHub profil resminiz, biyografiniz ve kamuya açık depolarınız senkronize edilir.'
                : 'Your GitHub avatar, bio, and public repositories sync seamlessly upon authorization.'}
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-zinc-500 font-mono">
            Lanux Software Systems &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
};
