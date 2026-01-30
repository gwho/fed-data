/**
 * Request Coalescer Unit Tests
 *
 * Tests for the request deduplication utility covering:
 * - Basic coalescing behavior
 * - Multiple concurrent requests
 * - Error handling
 * - Cleanup after completion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchWithCoalescing,
  isInFlight,
  getInFlightCount,
  getInFlightKeys,
  clearInFlightRequests,
  createFredCacheKey,
} from '../requestCoalescer';

// =============================================================================
// Test Setup
// =============================================================================

beforeEach(() => {
  // Clear any in-flight requests between tests
  clearInFlightRequests();
});

// =============================================================================
// createFredCacheKey Tests
// =============================================================================

describe('createFredCacheKey', () => {
  it('creates key with series ID only', () => {
    const key = createFredCacheKey('FEDFUNDS');
    expect(key).toBe('FEDFUNDS_default');
  });

  it('creates key with series ID and start date', () => {
    const key = createFredCacheKey('FEDFUNDS', '2024-01-01');
    expect(key).toBe('FEDFUNDS_2024-01-01');
  });

  it('handles undefined start date', () => {
    const key = createFredCacheKey('UNRATE', undefined);
    expect(key).toBe('UNRATE_default');
  });
});

// =============================================================================
// Basic Coalescing Tests
// =============================================================================

describe('fetchWithCoalescing - basic behavior', () => {
  it('executes fetcher and returns result', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: 'test' });

    const result = await fetchWithCoalescing('test-key', fetcher);

    expect(result).toEqual({ data: 'test' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('tracks in-flight request during execution', async () => {
    let resolvePromise: (value: string) => void;
    const slowFetcher = () =>
      new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });

    // Start the fetch but don't await
    const promise = fetchWithCoalescing('slow-key', slowFetcher);

    // Should be tracked as in-flight
    expect(isInFlight('slow-key')).toBe(true);
    expect(getInFlightCount()).toBe(1);
    expect(getInFlightKeys()).toContain('slow-key');

    // Resolve the promise
    resolvePromise!('done');
    await promise;

    // Should be cleaned up
    expect(isInFlight('slow-key')).toBe(false);
    expect(getInFlightCount()).toBe(0);
  });

  it('cleans up after error', async () => {
    const errorFetcher = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(fetchWithCoalescing('error-key', errorFetcher)).rejects.toThrow(
      'Network error'
    );

    // Should still clean up
    expect(isInFlight('error-key')).toBe(false);
    expect(getInFlightCount()).toBe(0);
  });
});

// =============================================================================
// Request Deduplication Tests
// =============================================================================

describe('fetchWithCoalescing - deduplication', () => {
  it('coalesces multiple simultaneous requests into one', async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { data: 'response', callNumber: callCount };
    });

    // Start 5 "simultaneous" requests
    const promises = [
      fetchWithCoalescing('same-key', fetcher),
      fetchWithCoalescing('same-key', fetcher),
      fetchWithCoalescing('same-key', fetcher),
      fetchWithCoalescing('same-key', fetcher),
      fetchWithCoalescing('same-key', fetcher),
    ];

    // All promises should resolve to the same result
    const results = await Promise.all(promises);

    // Fetcher should only be called once
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(callCount).toBe(1);

    // All results should be identical
    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toEqual(results[2]);
    expect(results[0]).toEqual(results[3]);
    expect(results[0]).toEqual(results[4]);
    expect(results[0].callNumber).toBe(1);
  });

  it('does not coalesce requests with different keys', async () => {
    const fetcher1 = vi.fn().mockResolvedValue({ key: '1' });
    const fetcher2 = vi.fn().mockResolvedValue({ key: '2' });
    const fetcher3 = vi.fn().mockResolvedValue({ key: '3' });

    const promises = [
      fetchWithCoalescing('key-1', fetcher1),
      fetchWithCoalescing('key-2', fetcher2),
      fetchWithCoalescing('key-3', fetcher3),
    ];

    const results = await Promise.all(promises);

    // Each fetcher should be called once
    expect(fetcher1).toHaveBeenCalledTimes(1);
    expect(fetcher2).toHaveBeenCalledTimes(1);
    expect(fetcher3).toHaveBeenCalledTimes(1);

    // Results should be different
    expect(results[0]).toEqual({ key: '1' });
    expect(results[1]).toEqual({ key: '2' });
    expect(results[2]).toEqual({ key: '3' });
  });

  it('allows new request after previous completes', async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      return { callNumber: callCount };
    });

    // First request
    const result1 = await fetchWithCoalescing('reusable-key', fetcher);
    expect(result1.callNumber).toBe(1);
    expect(isInFlight('reusable-key')).toBe(false);

    // Second request (after first completes) - should make new call
    const result2 = await fetchWithCoalescing('reusable-key', fetcher);
    expect(result2.callNumber).toBe(2);

    // Fetcher should have been called twice total
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('fetchWithCoalescing - error handling', () => {
  it('propagates error to all coalesced requests', async () => {
    const errorFetcher = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw new Error('Shared error');
    });

    // Start multiple requests
    const promises = [
      fetchWithCoalescing('error-key', errorFetcher),
      fetchWithCoalescing('error-key', errorFetcher),
      fetchWithCoalescing('error-key', errorFetcher),
    ];

    // All should reject with the same error
    const results = await Promise.allSettled(promises);

    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('rejected');

    // @ts-expect-error - accessing reason on rejected promise
    expect(results[0].reason.message).toBe('Shared error');

    // Fetcher only called once
    expect(errorFetcher).toHaveBeenCalledTimes(1);
  });

  it('allows retry after error', async () => {
    let callCount = 0;
    const flakeyFetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('First call fails');
      }
      return { data: 'success' };
    });

    // First request fails
    await expect(fetchWithCoalescing('flakey-key', flakeyFetcher)).rejects.toThrow();

    // Retry should work
    const result = await fetchWithCoalescing('flakey-key', flakeyFetcher);
    expect(result).toEqual({ data: 'success' });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('utility functions', () => {
  it('isInFlight returns false for unknown keys', () => {
    expect(isInFlight('unknown-key')).toBe(false);
  });

  it('getInFlightCount returns 0 when empty', () => {
    expect(getInFlightCount()).toBe(0);
  });

  it('getInFlightKeys returns empty array when no requests', () => {
    expect(getInFlightKeys()).toEqual([]);
  });

  it('clearInFlightRequests removes all tracked requests', async () => {
    // Start some requests but don't await
    // Using void to indicate we intentionally don't await these
    void fetchWithCoalescing('key-1', () =>
      new Promise((resolve) => setTimeout(() => resolve('1'), 1000))
    );
    void fetchWithCoalescing('key-2', () =>
      new Promise((resolve) => setTimeout(() => resolve('2'), 1000))
    );

    expect(getInFlightCount()).toBe(2);

    // Clear all
    clearInFlightRequests();

    expect(getInFlightCount()).toBe(0);
    expect(getInFlightKeys()).toEqual([]);

    // Note: The original promises will still resolve, but they're no longer tracked
  });
});

// =============================================================================
// Real-World Scenario Tests
// =============================================================================

describe('real-world scenarios', () => {
  it('handles FRED series request pattern', async () => {
    const mockFredFetch = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return [{ date: '2024-01-01', value: '5.33' }];
    });

    // Simulate multiple components requesting FEDFUNDS
    const key = createFredCacheKey('FEDFUNDS', '2024-01-01');

    const promises = [
      fetchWithCoalescing(key, () => mockFredFetch('FEDFUNDS')),
      fetchWithCoalescing(key, () => mockFredFetch('FEDFUNDS')),
      fetchWithCoalescing(key, () => mockFredFetch('FEDFUNDS')),
    ];

    const results = await Promise.all(promises);

    // Only one API call
    expect(mockFredFetch).toHaveBeenCalledTimes(1);

    // All results identical
    expect(results[0]).toEqual([{ date: '2024-01-01', value: '5.33' }]);
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
  });

  it('handles mixed parallel requests', async () => {
    const fetchers = {
      FEDFUNDS: vi.fn().mockResolvedValue([{ value: 'fed' }]),
      UNRATE: vi.fn().mockResolvedValue([{ value: 'unemployment' }]),
      GS10: vi.fn().mockResolvedValue([{ value: 'treasury' }]),
    };

    // Simulate dashboard loading multiple series
    // Some series requested multiple times (coalesce), some unique
    const promises = [
      fetchWithCoalescing('FEDFUNDS_default', fetchers.FEDFUNDS),
      fetchWithCoalescing('FEDFUNDS_default', fetchers.FEDFUNDS), // duplicate
      fetchWithCoalescing('UNRATE_default', fetchers.UNRATE),
      fetchWithCoalescing('GS10_default', fetchers.GS10),
      fetchWithCoalescing('GS10_default', fetchers.GS10), // duplicate
      fetchWithCoalescing('FEDFUNDS_default', fetchers.FEDFUNDS), // duplicate
    ];

    await Promise.all(promises);

    // Each unique series should only be fetched once
    expect(fetchers.FEDFUNDS).toHaveBeenCalledTimes(1);
    expect(fetchers.UNRATE).toHaveBeenCalledTimes(1);
    expect(fetchers.GS10).toHaveBeenCalledTimes(1);
  });
});
