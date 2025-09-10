interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Simple in-memory cache service
 * For production, consider using Redis or similar
 */
class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get cached data if it exists and is not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      // Expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data with TTL
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  /**
   * Delete cached data
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Delete all cache entries that match a pattern
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cache cleanup: removed ${removed} expired entries`);
    }
  }

  /**
   * Get cache stats for monitoring
   */
  getStats() {
    return {
      totalEntries: this.cache.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Global cache instance
let globalCache: CacheService | null = null;

/**
 * Get or create the global cache service
 */
export function getCache(): CacheService {
  if (!globalCache) {
    globalCache = new CacheService();
  }
  return globalCache;
}

/**
 * Shutdown the global cache service
 */
export function shutdownCache(): void {
  if (globalCache) {
    globalCache.shutdown();
    globalCache = null;
  }
}

/**
 * Cache keys for consistent access
 */
export const CacheKeys = {
  ADMIN_CRON_STATS: 'admin:cron:stats',
  ADMIN_EXECUTION_HISTORY: 'admin:cron:history',
  ADMIN_JOB_STATUS: 'admin:cron:jobs'
} as const;
