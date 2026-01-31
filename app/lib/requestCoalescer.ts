/**
 * Request Coalescer
 *
 * Prevents duplicate API calls when multiple components request the same data simultaneously.
 * Instead of making 5 API calls for the same series, we share ONE promise across all requesters.
 *
 * BEGINNER CONCEPT: Promise Sharing
 * ---------------------------------
 * When multiple parts of the app request the same data at the same time (before the cache
 * is populated), we "coalesce" them into a single request:
 *
 * Without coalescing:
 *   Component A: fetch('FEDFUNDS') → API call #1
 *   Component B: fetch('FEDFUNDS') → API call #2 (duplicate!)
 *   Component C: fetch('FEDFUNDS') → API call #3 (duplicate!)
 *
 * With coalescing:
 *   Component A: fetch('FEDFUNDS') → API call #1
 *   Component B: fetch('FEDFUNDS') → Reuse promise from #1
 *   Component C: fetch('FEDFUNDS') → Reuse promise from #1
 *
 * This is like a group of friends ordering pizza:
 * - Bad: Each friend orders a separate pizza for themselves
 * - Good: One friend orders, everyone shares the delivery
 *
 * @see docs/PERFORMANCE_OPTIMIZATION.md for full documentation
 */

// =============================================================================
// In-Flight Request Tracking
// =============================================================================

/**
 * Map of currently in-flight requests
 *
 * Key: Unique identifier for the request (e.g., "FEDFUNDS_2024-01-01")
 * Value: The Promise that will resolve with the data
 *
 * When a request completes (success or error), it's automatically removed.
 */
const inFlightRequests = new Map<string, Promise<unknown>>();

// =============================================================================
// Core Coalescing Function
// =============================================================================

/**
 * Fetch data with automatic request deduplication
 *
 * If the same request is already in-flight, returns the existing Promise
 * instead of starting a new fetch. This prevents duplicate API calls.
 *
 * @param key - Unique identifier for this request
 * @param fetcher - Function that performs the actual fetch
 * @returns Promise that resolves to the fetched data
 *
 * @example
 * ```typescript
 * // Multiple calls with same key share one fetch
 * const p1 = fetchWithCoalescing('user-123', () => fetchUser(123));
 * const p2 = fetchWithCoalescing('user-123', () => fetchUser(123));
 * // p1 === p2, only one API call is made
 * ```
 */
export async function fetchWithCoalescing<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check if this request is already in-flight
  const existing = inFlightRequests.get(key);
  if (existing) {
    // Reuse the existing promise - no new API call needed!
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Coalescer] Reusing in-flight request: ${key}`);
    }
    return existing as Promise<T>;
  }

  // Start a new fetch and track it
  const promise = fetcher()
    .then((result) => {
      // Success: return the result
      return result;
    })
    .finally(() => {
      // Clean up: remove from tracking when done (success or error)
      inFlightRequests.delete(key);
    });

  // Track this promise so other callers can reuse it
  inFlightRequests.set(key, promise);

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Coalescer] Started new request: ${key}`);
  }

  return promise;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a request is currently in-flight
 *
 * Useful for debugging and testing.
 *
 * @param key - The request key to check
 * @returns true if the request is currently pending
 */
export function isInFlight(key: string): boolean {
  return inFlightRequests.has(key);
}

/**
 * Get the count of currently in-flight requests
 *
 * Useful for debugging and monitoring.
 *
 * @returns Number of pending requests
 */
export function getInFlightCount(): number {
  return inFlightRequests.size;
}

/**
 * Get all currently in-flight request keys
 *
 * Useful for debugging.
 *
 * @returns Array of request keys
 */
export function getInFlightKeys(): string[] {
  return Array.from(inFlightRequests.keys());
}

/**
 * Clear all in-flight requests (for testing only)
 *
 * WARNING: This will leave any pending promises hanging.
 * Only use in test cleanup.
 */
export function clearInFlightRequests(): void {
  inFlightRequests.clear();
}

// =============================================================================
// Helper: Create Cache Key
// =============================================================================

/**
 * Create a consistent cache key for FRED series requests
 *
 * @param seriesId - FRED series identifier (e.g., "FEDFUNDS")
 * @param startDate - Optional start date filter
 * @returns Unique key for this request
 */
export function createFredCacheKey(seriesId: string, startDate?: string): string {
  return startDate ? `${seriesId}_${startDate}` : `${seriesId}_default`;
}
