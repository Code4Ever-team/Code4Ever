const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Basit bellek içi hız sınırı. true = izin verildi, false = limit aşıldı.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

export function clientRateLimitKey(action: string, identifier: string): string {
  return `${action}:${identifier}`;
}
