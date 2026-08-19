import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  Bell
} from 'lucide-react';
import {
  promptPWAInstall,
  subscribePWAInstallState,
  isPWARunningStandalone,
  isIOSDevice
} from '../utils/pwaHelper';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'tr' | 'en';
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  language
}) => {
  const [canInstallNative, setCanInstallNative] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    setIsStandalone(isPWARunningStandalone());
    setIsIOS(isIOSDevice());
    const unsubscribe = subscribePWAInstallState((canInstall) => {
      setCanInstallNative(canInstall);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    const result = await promptPWAInstall();
    setIsInstalling(false);
    if (result === 'accepted') {
      setInstalledSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#0e0e11] border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-200">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {language === 'tr' ? 'Uygulamayı Telefona İndir' : 'Install Mobile App'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">Progressive Web App (PWA)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {installedSuccess || isStandalone ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">
                {language === 'tr' ? 'Uygulama Yüklendi!' : 'App Installed!'}
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                {language === 'tr'
                  ? 'Code4Ever artık ana ekranınızda bağımsız bir mobil uygulama olarak çalışmaya hazır.'
                  : 'Code4Ever is ready on your home screen as a standalone mobile app.'}
              </p>
            </div>
          ) : (
            <>
              {/* App Card Info */}
              <div className="flex items-center gap-3.5 p-3.5 bg-zinc-950/80 rounded-2xl border border-zinc-800/80">
                <img
                  src="/logo.png"
                  alt="Code4Ever Logo"
                  className="w-12 h-12 rounded-2xl object-cover ring-1 ring-zinc-700 shadow-md"
                />
                <div>
                  <h4 className="text-sm font-bold text-white">Code4Ever</h4>
                  <p className="text-xs text-zinc-400">
                    {language === 'tr' ? 'Sosyal Geliştirici Platformu' : 'Developer Social Platform'}
                  </p>
                  <span className="inline-block mt-0.5 text-[10px] font-mono text-emerald-400">
                    ● {language === 'tr' ? 'Tek tıkla kurulum' : '1-click install'}
                  </span>
                </div>
              </div>

              {/* Benefits List */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    {language === 'tr'
                      ? 'Tam ekran uygulama deneyimi ve anında hızlı açılış'
                      : 'Full-screen app experience and ultra fast startup'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Smartphone className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>
                    {language === 'tr'
                      ? 'App Store veya Google Play gerekmeden doğrudan kurulum'
                      : 'Direct installation without App Store or Play Store'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    {language === 'tr'
                      ? 'Çevrimdışı önbellekleme ve minimum internet veri kullanımı'
                      : 'Offline caching and minimal data usage'}
                  </span>
                </div>
              </div>

              {/* Install Action Area */}
              {isIOS ? (
                /* iOS Safari Instructions */
                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>{language === 'tr' ? 'iOS (iPhone / iPad) Kurulumu:' : 'iOS Setup Instructions:'}</span>
                  </div>
                  <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside">
                    <li className="leading-relaxed">
                      {language === 'tr' ? 'Safari tarayıcısının altındaki ' : 'Tap the '}
                      <span className="font-semibold text-white inline-flex items-center gap-1 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                        <Share2 className="w-3 h-3 text-blue-400" /> {language === 'tr' ? 'Paylaş' : 'Share'}
                      </span>
                      {language === 'tr' ? ' butonuna dokunun.' : ' button at the bottom.'}
                    </li>
                    <li className="leading-relaxed">
                      {language === 'tr' ? 'Açılan menüde aşağı kaydırıp ' : 'Scroll down and tap '}
                      <span className="font-semibold text-white inline-flex items-center gap-1 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                        <PlusSquare className="w-3 h-3 text-emerald-400" /> {language === 'tr' ? 'Ana Ekrana Ekle' : 'Add to Home Screen'}
                      </span>
                      {language === 'tr' ? ' seçeneğine tıklayın.' : '.'}
                    </li>
                  </ol>
                </div>
              ) : (
                /* Android / Chrome One-Click Install Button */
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-3.5 px-4 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] cursor-pointer"
                >
                  <Download className="w-4 h-4 text-zinc-950 stroke-[2.5px]" />
                  <span>
                    {isInstalling
                      ? (language === 'tr' ? 'Yükleniyor...' : 'Installing...')
                      : (language === 'tr' ? 'Tek Tıkla Telefona İndir' : 'Install to Phone with 1-Click')}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
