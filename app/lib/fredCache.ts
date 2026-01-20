/**
 * FRED API Cache Implementation
 *
 * A two-tier caching system that stores FRED API data in:
 * 1. Memory (Map) - Fast access within the same session
 * 2. localStorage - Persistent storage across page refreshes
 *
 * This dramatically reduces API calls when users switch between dashboard tabs.
 *
 * @see docs/CACHING_IMPLEMENTATION.md for educational guide
 */

import { FredSeriesData } from './fredApi';

/**
 * Structure of a cached entry
 * Stores the data along with metadata for expiration checking
 */
interface CacheEntry {
  data: FredSeriesData[];
  timestamp: number;  // When the data was cached (ms since epoch)
  seriesId: string;   // Which FRED series this is (for debugging)
}

/**
 * Cache statistics for monitoring and debugging
 */
export interface CacheStats {
  memoryEntries: number;
  localStorageEntries: number;
  hitCount: number;
  missCount: number;
}

/**
 * FredCache - Two-tier caching for FRED API data
 *
 * Why two tiers?
 * - Memory cache: Instant access (microseconds), but lost on page refresh
 * - localStorage: Slower (milliseconds), but persists across sessions
 *
 * The cache checks memory first, then localStorage, then fetches from API.
 */
class FredCache {
  // In-memory cache using JavaScript Map
  private memoryCache: Map<string, CacheEntry> = new Map();

  // How long data stays valid (24 hours in milliseconds)
  // FRED data typically updates daily, so 24 hours is a good TTL
  private readonly TTL_MS = 24 * 60 * 60 * 1000;

  // Prefix for localStorage keys to avoid conflicts with other apps
  private readonly STORAGE_PREFIX = 'fred_cache_';

  // Enable verbose logging for learning/debugging
  private readonly DEBUG = true;

  // Track cache performance
  private hitCount = 0;
  private missCount = 0;

  /**
   * Generate a unique cache key from series ID and start date
   *
   * Example: "FEDFUNDS_2024-01-01" or "UNRATE_default"
   */
  private getCacheKey(seriesId: string, startDate?: string): string {
    return `${seriesId}_${startDate || 'default'}`;
  }

  /**
   * Check if a cached entry has expired
   *
   * @param timestamp - When the entry was cached
   * @returns true if older than TTL_MS (24 hours)
   */
  private isExpired(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    const expired = age > this.TTL_MS;

    if (this.DEBUG && expired) {
      const hoursOld = Math.round(age / (60 * 60 * 1000));
      console.log(`%c[CACHE] Expired: ${hoursOld} hours old (TTL: 24h)`, 'color: orange');
    }

    return expired;
  }

  /**
   * Log cache events with color-coded emojis for easy identification
   */
  private log(message: string, type: 'hit' | 'miss' | 'store' | 'clear' | 'info' = 'info'): void {
    if (!this.DEBUG) return;

    const styles = {
      hit: 'color: green; font-weight: bold',
      miss: 'color: orange',
      store: 'color: blue',
      clear: 'color: red',
      info: 'color: gray',
    };

    const emojis = {
      hit: '✅',
      miss: '🔍',
      store: '💾',
      clear: '🗑️',
      info: 'ℹ️',
    };

    console.log(`%c${emojis[type]} [CACHE] ${message}`, styles[type]);
  }

  /**
   * Try to get data from cache (memory first, then localStorage)
   *
   * @param seriesId - FRED series identifier (e.g., "FEDFUNDS")
   * @param startDate - Optional start date filter
   * @returns Cached data or null if not found/expired
   */
  get(seriesId: string, startDate?: string): FredSeriesData[] | null {
    const cacheKey = this.getCacheKey(seriesId, startDate);

    // STEP 1: Check memory cache (fastest)
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && !this.isExpired(memoryEntry.timestamp)) {
      this.hitCount++;
      this.log(`HIT (memory): ${seriesId} - ${memoryEntry.data.length} points`, 'hit');
      return memoryEntry.data;
    }

    // STEP 2: Check localStorage (persists across page refreshes)
    try {
      const storedJson = localStorage.getItem(this.STORAGE_PREFIX + cacheKey);
      if (storedJson) {
        const entry: CacheEntry = JSON.parse(storedJson);

        if (!this.isExpired(entry.timestamp)) {
          // Found valid entry in localStorage - also store in memory for faster access
          this.memoryCache.set(cacheKey, entry);
          this.hitCount++;
          this.log(`HIT (localStorage): ${seriesId} - ${entry.data.length} points`, 'hit');
          return entry.data;
        } else {
          // Entry expired - clean it up
          localStorage.removeItem(this.STORAGE_PREFIX + cacheKey);
          this.log(`EXPIRED: ${seriesId} - removing from localStorage`, 'miss');
        }
      }
    } catch (error) {
      // localStorage might be unavailable (private browsing, storage full, etc.)
      this.log(`localStorage read error: ${error}`, 'info');
    }

    // STEP 3: Cache miss - need to fetch from API
    this.missCount++;
    this.log(`MISS: ${seriesId} - will fetch from API`, 'miss');
    return null;
  }

  /**
   * Store data in both memory and localStorage
   *
   * @param seriesId - FRED series identifier
   * @param startDate - Optional start date filter
   * @param data - The fetched data to cache
   */
  set(seriesId: string, startDate: string | undefined, data: FredSeriesData[]): void {
    const cacheKey = this.getCacheKey(seriesId, startDate);

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      seriesId,
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, entry);

    // Store in localStorage for persistence
    try {
      localStorage.setItem(this.STORAGE_PREFIX + cacheKey, JSON.stringify(entry));
      this.log(`STORED: ${seriesId} - ${data.length} data points`, 'store');
    } catch (error) {
      // localStorage might be full - that's okay, we still have memory cache
      this.log(`localStorage write error (storage may be full): ${error}`, 'info');
    }
  }

  /**
   * Clear cache - either specific series or all cached data
   *
   * @param seriesId - Optional series to clear (clears all if not provided)
   */
  clear(seriesId?: string): void {
    if (seriesId) {
      // Clear specific series from memory
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(seriesId)) {
          this.memoryCache.delete(key);
        }
      }

      // Clear specific series from localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX + seriesId)) {
          localStorage.removeItem(key);
        }
      }

      this.log(`CLEARED: ${seriesId}`, 'clear');
    } else {
      // Clear all cache
      this.memoryCache.clear();

      // Clear all FRED cache entries from localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }

      // Reset statistics
      this.hitCount = 0;
      this.missCount = 0;

      this.log('CLEARED: All cache data', 'clear');
    }
  }

  /**
   * Get cache statistics for monitoring and debugging
   *
   * Useful for understanding cache effectiveness
   */
  getStats(): CacheStats {
    // Count localStorage entries
    let localStorageEntries = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        localStorageEntries++;
      }
    }

    return {
      memoryEntries: this.memoryCache.size,
      localStorageEntries,
      hitCount: this.hitCount,
      missCount: this.missCount,
    };
  }

  /**
   * Calculate cache hit rate as a percentage
   *
   * @returns Hit rate percentage (0-100)
   */
  getHitRate(): number {
    const total = this.hitCount + this.missCount;
    if (total === 0) return 0;
    return Math.round((this.hitCount / total) * 100);
  }
}

// Export a singleton instance for use across the app
export const fredCache = new FredCache();

// Also export the class for testing purposes
export { FredCache };
