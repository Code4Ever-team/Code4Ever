/**
 * High precision relative time formatter for Turkish and English
 * Replaces hardcoded "Az önce" with accurate "şimdi", "5 dk önce", "2 saat önce", "3 gün önce", etc.
 */

export function formatTimeAgo(dateInput: string | number | Date | null | undefined, language: 'tr' | 'en' = 'tr'): string {
  if (!dateInput) {
    return language === 'tr' ? 'şimdi' : 'just now';
  }

  let date: Date;
  if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) {
    return language === 'tr' ? 'şimdi' : 'just now';
  }

  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 45) {
    return language === 'tr' ? 'şimdi' : 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return language === 'tr' ? `${diffInMinutes} dk önce` : `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return language === 'tr' ? `${diffInHours} saat önce` : `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return language === 'tr' ? `${diffInDays} gün önce` : `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return language === 'tr' ? `${diffInWeeks} hafta önce` : `${diffInWeeks}w ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return language === 'tr' ? `${diffInMonths} ay önce` : `${diffInMonths}mo ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return language === 'tr' ? `${diffInYears} yıl önce` : `${diffInYears}y ago`;
}

/**
 * Formats last seen status
 */
export function formatLastSeen(dateInput: string | number | Date | null | undefined, isOnline: boolean, language: 'tr' | 'en' = 'tr'): string {
  if (isOnline) {
    return language === 'tr' ? 'Çevrim içi' : 'Online';
  }
  if (!dateInput) {
    return language === 'tr' ? 'Çevrim dışı' : 'Offline';
  }
  const timeStr = formatTimeAgo(dateInput, language);
  return language === 'tr' ? `Son görülme ${timeStr}` : `Last seen ${timeStr}`;
}
