/**
 * Rate Limiter for API requests and message sending
 * Prevents abuse and ensures compliance with carrier limits
 */

import { NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

const limits: Record<string, RateLimitConfig> = {
  // Message sending limits (per contact per hour)
  sms: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  whatsapp: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  email: { windowMs: 60 * 60 * 1000, maxRequests: 20 },
  
  // API request limits (per IP per minute)
  api: { windowMs: 60 * 1000, maxRequests: 100 },
};

// In-memory store (use Redis for production)
const requestStore = new Map<string, number[]>();

/**
 * Check if a request should be rate-limited
 * @param key - Unique identifier (IP, contactId+channel, etc.)
 * @param limitType - Type of limit to apply
 * @returns true if rate limit exceeded, false otherwise
 */
export function isRateLimited(key: string, limitType: keyof typeof limits): boolean {
  const config = limits[limitType];
  if (!config) return false;

  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get existing requests for this key
  let requests = requestStore.get(key) || [];

  // Filter out old requests outside the time window
  requests = requests.filter((timestamp) => timestamp > windowStart);

  // Check if limit exceeded
  if (requests.length >= config.maxRequests) {
    return true;
  }

  // Add current request
  requests.push(now);
  requestStore.set(key, requests);

  return false;
}

/**
 * Get remaining requests for a key
 */
export function getRemainingRequests(
  key: string,
  limitType: keyof typeof limits
): { remaining: number; resetAt: Date } {
  const config = limits[limitType];
  if (!config) return { remaining: Infinity, resetAt: new Date() };

  const now = Date.now();
  const windowStart = now - config.windowMs;

  let requests = requestStore.get(key) || [];
  requests = requests.filter((timestamp) => timestamp > windowStart);

  const remaining = Math.max(0, config.maxRequests - requests.length);
  const oldestRequest = requests[0] || now;
  const resetAt = new Date(oldestRequest + config.windowMs);

  return { remaining, resetAt };
}

/**
 * Clear rate limit for a key (admin override)
 */
export function clearRateLimit(key: string): void {
  requestStore.delete(key);
}

/**
 * Add rate limit headers to a NextResponse
 */
export function addRateLimitHeaders(
  response: NextResponse,
  key: string,
  limitType: keyof typeof limits
): NextResponse {
  const { remaining, resetAt } = getRemainingRequests(key, limitType);
  const config = limits[limitType];

  if (config) {
    response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", Math.floor(resetAt.getTime() / 1000).toString());
  }

  return response;
}

/**
 * Clean up old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  const maxWindow = Math.max(...Object.values(limits).map((l) => l.windowMs));

  for (const [key, requests] of requestStore.entries()) {
    const filtered = requests.filter((timestamp) => timestamp > now - maxWindow);
    if (filtered.length === 0) {
      requestStore.delete(key);
    } else {
      requestStore.set(key, filtered);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes
