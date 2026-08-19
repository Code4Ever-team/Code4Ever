// PWA Helper & Install Event Manager

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(canInstall: boolean) => void>();

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  if (typeof window !== 'undefined') {
    // Check if launched as PWA and mark in session
    if (isPWARunningStandalone()) {
      try {
        localStorage.setItem('c4e_is_pwa_installed', 'true');
      } catch {}
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      notifyListeners(true);
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Code4Ever app successfully installed');
      deferredPrompt = null;
      try {
        localStorage.setItem('c4e_is_pwa_installed', 'true');
      } catch {}
      notifyListeners(false);
    });
  }
}

function notifyListeners(canInstall: boolean) {
  listeners.forEach((listener) => listener(canInstall));
}

export function subscribePWAInstallState(callback: (canInstall: boolean) => void) {
  listeners.add(callback);
  callback(Boolean(deferredPrompt));
  return () => {
    listeners.delete(callback);
  };
}

export async function promptPWAInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
  if (!deferredPrompt) {
    return 'unsupported';
  }

  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      deferredPrompt = null;
      try {
        localStorage.setItem('c4e_is_pwa_installed', 'true');
      } catch {}
      notifyListeners(false);
      return 'accepted';
    }
    return 'dismissed';
  } catch (error) {
    console.error('[PWA] Error during prompt:', error);
    return 'unsupported';
  }
}

export function isPWARunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreenMedia = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUIMedia = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;
  const isAndroidTWA = document.referrer.includes('android-app://');
  const isLocalStoragePWA = localStorage.getItem('c4e_is_pwa_installed') === 'true';

  return isStandaloneMedia || isFullscreenMedia || isMinimalUIMedia || isIOSStandalone || isAndroidTWA || isLocalStoragePWA;
}

export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /android/.test(ua);
}
