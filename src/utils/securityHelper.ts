/**
 * Code4Ever Platform Security Utility
 * Provides defense-in-depth sanitization, XSS mitigation, URL validation,
 * role/privilege protection, reserved username safeguards, and anti-spam verification.
 */

// Reserved system usernames that cannot be claimed or impersonated by regular users
export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'nylithra',
  'c4e_admin',
  'code4ever',
  'system',
  'root',
  'support',
  'staff',
  'moderator',
  'security',
  'official',
  'api',
  'bot',
  'feed',
  'explore',
  'notifications',
  'messages',
  'everychat',
  'projects',
  'communities',
  'bookmarks',
  'settings',
  'profile',
  'abonelik',
  'subscriptions'
]);

/**
 * Checks if a requested username is a protected system username.
 */
export function isReservedUsername(username: string): boolean {
  if (!username) return false;
  const clean = username.trim().toLowerCase().replace(/^@/, '');
  return RESERVED_USERNAMES.has(clean);
}

/**
 * Validates and normalizes a username.
 * Only allows alphanumeric characters and underscores (3-25 chars).
 */
export function validateUsername(username: string): { isValid: boolean; error?: string; cleanUsername: string } {
  const clean = username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
  
  if (clean.length < 3) {
    return { isValid: false, error: 'Kullanıcı adı en az 3 karakter olmalıdır.', cleanUsername: clean };
  }
  if (clean.length > 25) {
    return { isValid: false, error: 'Kullanıcı adı en fazla 25 karakter olabilir.', cleanUsername: clean.substring(0, 25) };
  }
  if (isReservedUsername(clean)) {
    return { isValid: false, error: 'Bu kullanıcı adı sistem tarafından ayrılmıştır, seçilemez.', cleanUsername: clean };
  }
  return { isValid: true, cleanUsername: clean };
}

/**
 * Strict URL sanitizer to prevent javascript:, vbscript:, and malicious data: URI execution.
 * Only permits http:, https:, or mailto: protocols.
 */
export function sanitizeUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  
  // Check for dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html') ||
    lower.startsWith('data:application')
  ) {
    return '#';
  }
  
  // Ensure valid web protocol or prepend https if needed
  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:')) {
    return trimmed;
  }
  
  // If it's a domain-like string (e.g. github.com/user), prepend https://
  if (trimmed.includes('.') && !trimmed.startsWith('/')) {
    return `https://${trimmed}`;
  }
  
  // Relative path is allowed
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  
  return '#';
}

/**
 * Sanitizes plain text input by stripping out raw HTML tags and dangerous scripts.
 */
export function sanitizeText(input?: string | null, maxLength = 5000): string {
  if (!input || typeof input !== 'string') return '';
  
  // Trim and truncate to reasonable maximum length to prevent payload DoS
  const truncated = input.trim().slice(0, maxLength);
  
  // Strip dangerous tag patterns and script blocks
  const sanitized = truncated
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // inline event handlers
    .replace(/javascript:/gi, '');
    
  return sanitized;
}

/**
 * Strict check for admin authorization.
 * Verifies that the user has database-level admin permissions (isAdmin === true or role === 'admin' / 'founder').
 * Avoids relying on static username strings.
 */
export function verifyAdminAccess(user?: { username?: string; role?: string; id?: string; isAdmin?: boolean } | null): boolean {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  const role = (user.role || '').toLowerCase().trim();
  return role === 'admin' || role === 'founder' || role === 'code4ever yetkilisi';
}

/**
 * Checks if a username is available across the system, excluding the current user.
 */
export function checkUsernameAvailability(
  requestedUsername: string,
  currentUserId: string,
  allUsers: Array<{ id: string; username: string }> = []
): { isAvailable: boolean; reason?: string } {
  const clean = requestedUsername.trim().toLowerCase().replace(/^@/, '');
  
  if (isReservedUsername(clean)) {
    return { isAvailable: false, reason: 'Bu kullanıcı adı sistem tarafından ayrılmıştır.' };
  }
  
  const isTaken = allUsers.some(
    (u) => u.id !== currentUserId && (u.username || '').toLowerCase().replace(/^@/, '') === clean
  );
  
  if (isTaken) {
    return { isAvailable: false, reason: `"${requestedUsername}" kullanıcı adı sistemde zaten kayıtlı!` };
  }
  
  return { isAvailable: true };
}

/**
 * Persistent Rate Limiter based on Session Storage
 * Prevents bypassing rate limits through simple page refreshes or quick tab switches.
 */
const RATE_LIMIT_PREFIX = 'c4e_sec_rl_';

export function checkPersistentRateLimit(
  actionKey: string,
  cooldownSeconds: number
): { allowed: boolean; waitRemainingSeconds: number } {
  if (typeof window === 'undefined') return { allowed: true, waitRemainingSeconds: 0 };
  
  const storageKey = `${RATE_LIMIT_PREFIX}${actionKey}`;
  const now = Date.now();
  const lastTimeStr = sessionStorage.getItem(storageKey);
  
  if (lastTimeStr) {
    const lastTime = parseInt(lastTimeStr, 10);
    const elapsed = (now - lastTime) / 1000;
    if (elapsed < cooldownSeconds) {
      return {
        allowed: false,
        waitRemainingSeconds: Math.ceil(cooldownSeconds - elapsed)
      };
    }
  }
  
  sessionStorage.setItem(storageKey, String(now));
  return { allowed: true, waitRemainingSeconds: 0 };
}

/**
 * Anti-Duplicate Post Hash Check
 * Prevents submitting the exact same content within 30 seconds (spam prevention).
 */
export function checkDuplicatePost(content: string): boolean {
  if (typeof window === 'undefined' || !content) return false;
  
  const key = 'c4e_sec_last_post_hash';
  const timeKey = 'c4e_sec_last_post_time';
  
  const currentHash = simpleHash(content.trim());
  const lastHash = sessionStorage.getItem(key);
  const lastTime = parseInt(sessionStorage.getItem(timeKey) || '0', 10);
  
  const now = Date.now();
  if (lastHash === currentHash && now - lastTime < 30000) {
    return true; // Is duplicate
  }
  
  sessionStorage.setItem(key, currentHash);
  sessionStorage.setItem(timeKey, String(now));
  return false;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return String(hash);
}
