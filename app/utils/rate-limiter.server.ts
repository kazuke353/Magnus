import { LRUCache } from 'lru-cache';

interface RateLimitInfo {
  count: number;
  startTime: number;
}

// Configure cache options
const options = {
  max: 500, // Max number of clients to track
  ttl: 60 * 1000, // 1 minute TTL (time-to-live)
};

const tokenCache = new LRUCache<string, RateLimitInfo>(options);

interface RateLimiterOptions {
  limit: number; // Max requests per windowMs
  windowMs: number; // Window size in milliseconds
}

/**
 * Simple in-memory rate limiter based on IP address.
 * NOTE: In a distributed environment or production, a more robust solution
 * (like Redis) is recommended. This is suitable for single-instance demos.
 * It also relies on trusting the IP address, which might not be reliable
 * behind proxies without proper configuration (e.g., X-Forwarded-For).
 */
export function rateLimiter(options: RateLimiterOptions) {
  return (request: Request): { allowed: boolean; remaining: number } => {
    // Attempt to get IP address - this might be unreliable in some environments
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               request.headers.get('cf-connecting-ip') || // Cloudflare
               request.headers.get('client-ip') ||
               'unknown'; // Fallback

    const key = `rate-limit:${ip}`;
    const now = Date.now();
    const currentEntry = tokenCache.get(key);

    let currentCount = 0;
    if (currentEntry && (now - currentEntry.startTime < options.windowMs)) {
      // Entry exists and is within the window
      currentCount = currentEntry.count;
    }

    if (currentCount >= options.limit) {
      // Limit exceeded
      return { allowed: false, remaining: 0 };
    }

    // Increment count and update/set cache entry
    const newCount = currentCount + 1;
    tokenCache.set(key, { count: newCount, startTime: currentEntry?.startTime && (now - currentEntry.startTime < options.windowMs) ? currentEntry.startTime : now });

    return { allowed: true, remaining: options.limit - newCount };
  };
}

// Example limiter: 100 requests per minute per IP
export const apiLimiter = rateLimiter({ limit: 100, windowMs: 60 * 1000 });
// Stricter limiter for auth attempts
export const authLimiter = rateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 }); // 10 requests per 15 mins
