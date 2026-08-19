import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Share2,
  PlusSquare,
  MoreVertical,
  Download,
  Laptop,
  CheckCircle2,
  X,
  Sparkles,
  HelpCircle,
  Zap,
  ArrowRight
} from 'lucide-react';
import {
  promptPWAInstall,
  subscribePWAInstallState,
  isPWARunningStandalone,
  isIOSDevice,
  isAndroidDevice
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
  const [deviceTab, setDeviceTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [canInstallNative, setCanInstallNative] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAttempting, setIsAttempting] = useState(false);
  const [attemptMessage, setAttemptMessage] = useState<string | null>(null);

  useEffect(() => {
    const standalone = isPWARunningStandalone();
    setIsStandalone(standalone);

    if (isIOSDevice()) {
      setDeviceTab('ios');
    } else if (isAndroidDevice()) {
      setDeviceTab('android');
    } else {
      setDeviceTab('android');
    }

    const unsubscribe = subscribePWAInstallState((canInstall) => {
      setCanInstallNative(canInstall);
    });
    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTryNativeInstall = async () => {
    setIsAttempting(true);
    setAttemptMessage(null);
    const result = await promptPWAInstall();
    setIsAttempting(false);

    if (result === 'accepted') {
      setAttemptMessage(
        language === 'tr'
          ? 'Tebrikler! Uygulama başarıyla kuruldu.'
          : 'Success! App successfully installed.'
      );
      setTimeout(() => {
        onClose();
      }, 1500);
    } else if (result === 'unsupported') {
      setAttemptMessage(
        language === 'tr'
          ? 'Tarayıcınız otomatik tetiklemeyi kısıtladı. Lütfen aşağıdaki 3 adımı uygulayarak kurun.'
          : 'Automatic prompt is restricted by your browser. Please follow the 3 steps below.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#0e0e11] border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/80 text-zinc-200">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {language === 'tr' ? 'Telefona Nasıl İndirilir?' : 'How to Install on Phone?'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {language === 'tr' ? '1 Dakikalık Kolay Kurulum Rehberi' : 'Easy 1-Minute Setup Guide'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 pb-1">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950 rounded-2xl border border-zinc-800/80">
            <button
              onClick={() => setDeviceTab('android')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                deviceTab === 'android'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>

            <button
              onClick={() => setDeviceTab('ios')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                deviceTab === 'ios'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>iPhone (iOS)</span>
            </button>

            <button
              onClick={() => setDeviceTab('desktop')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                deviceTab === 'desktop'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>{language === 'tr' ? 'Masaüstü' : 'PC/Mac'}</span>
            </button>
          </div>
        </div>

        {/* Guide Content */}
        <div className="p-6 space-y-5">
          {attemptMessage && (
            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{attemptMessage}</span>
            </div>
          )}

          {/* Android Steps */}
          {deviceTab === 'android' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5 p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{language === 'tr' ? 'Tarayıcı Menüsünü Açın' : 'Open Browser Menu'}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 font-mono">
                      <MoreVertical className="w-3 h-3 text-zinc-400" /> {language === 'tr' ? 'Üç Nokta' : '3 Dots'}
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'tr'
                      ? 'Chrome, Samsung İnternet veya Brave tarayıcınızın sağ üst köşesindeki (üç nokta ⋮) butonuna dokunun.'
                      : 'Tap the (three dots ⋮) icon at the top right of Chrome or Samsung Internet.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{language === 'tr' ? '"Uygulamayı Yükle" Seçeneğine Dokunun' : 'Tap "Install App"'}</span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'tr'
                      ? 'Açılan menüde "Uygulamayı Yükle" veya "Ana Ekrana Ekle" seçeneğine dokunun.'
                      : 'Select "Install app" or "Add to Home screen" from the menu list.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{language === 'tr' ? '"Yükle" Butonuna Basın' : 'Confirm "Install"'}</span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'tr'
                      ? 'Çıkan pencerede onaylayın. Code4Ever doğrudan telefon ana ekranınıza bağımsız uygulama olarak eklenecektir!'
                      : 'Confirm the prompt. Code4Ever will instantly appear on your home screen!'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* iOS / iPhone Steps */}
          {deviceTab === 'ios' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5 p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{language === 'tr' ? 'Safari Paylaş Butonuna Dokunun' : 'Tap Safari Share Button'}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 font-mono">
                      <Share2 className="w-3 h-3 text-blue-400" /> {language === 'tr' ? 'Paylaş' : 'Share'}
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'tr'
                      ? 'iPhone Safari tarayıcınızın alt çubuğunda yer alan kare içinden yukarı ok çıkan Paylaş simgesine dokunun.'
                      : 'Tap the Share icon (square with arrow) at the bottom toolbar in Safari.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{language === 'tr' ? '"Ana Ekrana Ekle"yi Seçin' : 'Select "Add to Home Screen"'}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-emerald-400 font-mono">
                      <PlusSquare className="w-3 h-3 text-emerald-400" /> +
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'tr'
                      ? 'Açılan seçeneklerde biraz aşağı kaydırıp "Ana Ekrana Ekle" satırına tıklayın.'
                      : 'Scroll down the share sheet and tap "Add to Home Screen".'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">
                    {language === 'tr' ? 'Sağ Üstten "Ekle"ye Basın' : 'Tap "Add" at Top Right'}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'tr'
                      ? 'Sağ üst köşedeki "Ekle" butonuna dokunarak kurulumu tamamlayın. Uygulama ana ekranınızda hazır olacaktır.'
                      : 'Tap "Add" in the top right corner. The app will be ready on your iPhone home screen.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Steps */}
          {deviceTab === 'desktop' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5 p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{language === 'tr' ? 'Adres Çubuğundaki Yükle İkonuna Tıklayın' : 'Click Install Icon in URL Bar'}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 font-mono">
                      <Download className="w-3 h-3 text-zinc-400" />
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'tr'
                      ? 'Chrome, Edge veya Brave tarayıcınızın üst adres çubuğunun en sağındaki "Uygulamayı Yükle" simgesine tıklayın.'
                      : 'Click the install icon located at the right end of the address bar.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">
                    {language === 'tr' ? '"Yükle" Butonuna Basın' : 'Confirm "Install"'}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'tr'
                      ? 'Açılan küçük pencerede "Yükle" diyerek uygulamayı masaüstünüze ve görev çubuğunuza ekleyin.'
                      : 'Confirm the installation to pin Code4Ever to your desktop and taskbar.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Optional Automatic Trigger Button */}
          <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleTryNativeInstall}
              disabled={isAttempting}
              className="w-full py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              <Zap className="w-4 h-4 text-zinc-950 fill-zinc-950" />
              <span>
                {isAttempting
                  ? (language === 'tr' ? 'Kontrol Ediliyor...' : 'Checking...')
                  : (language === 'tr' ? 'Otomatik Kurulum Penceresini Açmayı Dene' : 'Try Opening Install Prompt')}
              </span>
            </button>

            <p className="text-[11px] text-zinc-400 text-center font-mono">
              {language === 'tr'
                ? '💡 Not: Tarayıcı güvenlik kuralları gereği otomatik pencere açılmazsa yukarıdaki 3 adımı takip edin.'
                : '💡 Note: If automatic popup is blocked by browser, simply follow the 3 steps above.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
