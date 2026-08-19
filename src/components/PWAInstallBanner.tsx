import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { isPWARunningStandalone, subscribePWAInstallState } from '../utils/pwaHelper';

interface PWAInstallBannerProps {
  onOpenInstallModal: () => void;
  language: 'tr' | 'en';
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  onOpenInstallModal,
  language
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const standalone = isPWARunningStandalone();
    setIsStandalone(standalone);

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('c4e_pwa_banner_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    sessionStorage.setItem('c4e_pwa_banner_dismissed', 'true');
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <aside
      aria-label="PWA Install Banner"
      className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-30 bg-[#0e0e11]/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300"
    >
      <div
        onClick={onOpenInstallModal}
        className="flex items-center gap-3 cursor-pointer flex-1 overflow-hidden"
      >
        <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200 flex-shrink-0">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="truncate">
          <h4 className="text-xs font-bold text-white tracking-tight">
            {language === 'tr' ? 'Uygulamayı Telefona İndir' : 'Install Mobile App'}
          </h4>
          <p className="text-[11px] text-zinc-400 font-mono truncate">
            {language === 'tr' ? 'Tek tıkla ana ekrana ekle' : 'Add to home screen in 1 click'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onOpenInstallModal}
          className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-zinc-950 stroke-[2.5px]" />
          <span>{language === 'tr' ? 'İndir' : 'Install'}</span>
        </button>

        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors cursor-pointer"
          title={language === 'tr' ? 'Kapat' : 'Dismiss'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
