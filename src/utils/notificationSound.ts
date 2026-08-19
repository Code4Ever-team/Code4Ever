// WhatsApp-Style Notification Sound & Native Push/Desktop Notification Manager

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a pleasant WhatsApp / iOS style multi-tone chime using Web Audio API.
 * High fidelity, zero external network dependency, instant response offline or online.
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Master Gain for smooth volume control
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.35, now);
    masterGain.connect(ctx.destination);

    // Chime Note 1 (E6 - 1318.5 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.5, now);

    gain1.gain.setValueAtTime(0.01, now);
    gain1.gain.exponentialRampToValueAtTime(0.8, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Chime Note 2 (B6 - 1975.5 Hz - Sweet high harmonic)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1975.5, now + 0.08);

    gain2.gain.setValueAtTime(0.01, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.9, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.6);

    // Subtle soft bell body tone (G#5 - 830.6 Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(830.6, now + 0.04);

    gain3.gain.setValueAtTime(0.01, now + 0.04);
    gain3.gain.exponentialRampToValueAtTime(0.4, now + 0.06);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc3.connect(gain3);
    gain3.connect(masterGain);
    osc3.start(now + 0.04);
    osc3.stop(now + 0.5);
  } catch (err) {
    console.warn('[NotificationSound] Audio playback failed:', err);
  }
}

/**
 * Checks current notification permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests native notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    // Warm up audio context upon user gesture
    getAudioContext();
    return permission;
  } catch (err) {
    console.warn('[Notification] Error requesting permission:', err);
    return 'denied';
  }
}

export interface NativeNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  playSound?: boolean;
  vibrate?: boolean;
}

/**
 * Sends a native system notification to Desktop (Windows/Mac/Linux) or Mobile (Android/PWA)
 * and plays the WhatsApp notification sound.
 */
export async function sendNativeNotification(options: NativeNotificationOptions) {
  const {
    title,
    body,
    icon = '/logo.png',
    tag = 'code4ever-alert',
    url = '/',
    playSound = true,
    vibrate = true
  } = options;

  // 1. Play sound
  if (playSound) {
    playNotificationSound();
  }

  // 2. Trigger mobile hardware vibration if supported
  if (vibrate && typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate([100, 50, 100, 50, 200]);
    } catch {}
  }

  // 3. Show System / Mobile / Desktop Notification
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const notifOptions: any = {
    body,
    icon,
    badge: '/logo.png',
    tag,
    data: { url },
    renotify: true,
    silent: false,
    vibrate: [100, 50, 100, 50, 200]
  };

  try {
    // Prefer Service Worker showNotification for Android PWA background & lock-screen
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, notifOptions);
        return;
      }
    }

    // Fallback to standard desktop Notification API
    const notification = new Notification(title, notifOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.warn('[Notification] Failed to show system notification:', err);
  }
}
