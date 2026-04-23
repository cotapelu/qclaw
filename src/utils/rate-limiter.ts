/**
 * Simple in-memory rate limiter using sliding window
 */
export class RateLimiter {
  private records: Map<string, number[]> = new Map(); // command -> [timestamps]
  private cleanupInterval: any;
  
  constructor(private readonly cleanupMs: number = 60000) {
    // Periodically cleanup old entries
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupMs);
  }

  /**
   * Check if command is allowed (returns true if under limit)
   * @param command - Command name (e.g., 'backup', 'marketplace')
   * @param maxPerMinute - Max executions per minute
   */
  check(command: string, maxPerMinute: number = 30): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute sliding window
    const key = command.toLowerCase();
    
    let timestamps = this.records.get(key) || [];
    // Remove old entries outside window
    const cutoff = now - windowMs;
    timestamps = timestamps.filter(ts => ts > cutoff);
    
    if (timestamps.length >= maxPerMinute) {
      return false; // Rate limit exceeded
    }
    
    timestamps.push(now);
    this.records.set(key, timestamps);
    return true;
  }

  /**
   * Get remaining tokens (executions) for a command in the current window
   */
  remaining(command: string, maxPerMinute: number = 30): number {
    const now = Date.now();
    const windowMs = 60000;
    const key = command.toLowerCase();
    const timestamps = this.records.get(key) || [];
    const cutoff = now - windowMs;
    const recent = timestamps.filter(ts => ts > cutoff);
    return Math.max(0, maxPerMinute - recent.length);
  }

  /**
   * Get reset time (ms) for a command
   */
  resetIn(command: string): number {
    const now = Date.now();
    const windowMs = 60000;
    const key = command.toLowerCase();
    const timestamps = this.records.get(key) || [];
    if (timestamps.length === 0) return 0;
    const oldest = Math.min(...timestamps);
    const resetAt = oldest + windowMs;
    return Math.max(0, resetAt - now);
  }

  private cleanup(): void {
    const now = Date.now();
    const windowMs = 60000;
    for (const [key, timestamps] of this.records.entries()) {
      const cutoff = now - windowMs;
      const filtered = timestamps.filter(ts => ts > cutoff);
      if (filtered.length === 0) {
        this.records.delete(key);
      } else {
        this.records.set(key, filtered);
      }
    }
  }

  /**
   * Clear all rate limits (for testing)
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Stop the cleanup interval
   */
  stop(): void {
    clearInterval(this.cleanupInterval);
  }
}

/**
 * Rate limit configuration per command
 */
export const DEFAULT_RATE_LIMITS: Record<string, number> = {
  // Default: 30 per minute
  'default': 30,
  // Heavy commands: lower limits
  'backup': 5,           // 5 per minute
  'restore': 5,          // 5 per minute
  'marketplace': 10,     // 10 per minute
  'create-extension': 10, // 10 per minute
  'install': 5,          // npm install
  'auto-backup': 12,     // 12 per minute
};

/**
 * Get rate limit for a command
 */
export function getRateLimit(command: string): number {
  // Check exact match
  if (DEFAULT_RATE_LIMITS[command] !== undefined) {
    return DEFAULT_RATE_LIMITS[command];
  }
  // Check prefix match (e.g., 'marketplace search' -> 'marketplace')
  for (const [prefix, limit] of Object.entries(DEFAULT_RATE_LIMITS)) {
    if (prefix !== 'default' && command.startsWith(prefix)) {
      return limit;
    }
  }
  return DEFAULT_RATE_LIMITS.default;
}
