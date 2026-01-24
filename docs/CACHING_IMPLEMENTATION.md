# Caching Implementation Guide

> A beginner-friendly guide to understanding and implementing caching in web applications.

---

## Table of Contents

1. [What is Caching?](#what-is-caching)
2. [Why We Needed Caching](#why-we-needed-caching)
3. [How Our Cache Works](#how-our-cache-works)
4. [Code Walkthrough](#code-walkthrough)
5. [Key Concepts for Beginners](#key-concepts-for-beginners)
6. [Testing the Cache](#testing-the-cache)
7. [Further Learning](#further-learning)

---

## What is Caching?

### Simple Analogy

Imagine you're writing a research paper and need to look up a fact from a library book:

**Without caching (slow):**
1. Walk to the library (takes 5 minutes)
2. Find the book
3. Look up the fact
4. Walk back home
5. Repeat this every time you need ANY fact

**With caching (fast):**
1. First time: Walk to library, photocopy the relevant pages
2. Keep photocopies on your desk
3. Next time: Just check your desk! (takes 5 seconds)

**Caching in programming is the same idea** - we store data that's expensive to get (like API calls) so we can reuse it quickly.

### Technical Definition

> **Caching** is the practice of storing copies of data in a temporary storage location (cache) so that future requests for that data can be served faster.

---

## Why We Needed Caching

### The Problem

Our FRED dashboard was making **redundant API calls** every time you switched tabs:

```
User Journey (BEFORE caching):
─────────────────────────────────────────────────────────
Tab                    │ API Calls  │ Total Time
─────────────────────────────────────────────────────────
1. Load app            │     8      │ ~2 seconds
2. Click "Inflation"   │     7      │ ~1.5 seconds
3. Click "Employment"  │     4      │ ~1 second
4. Click "Inflation"   │     7      │ ~1.5 seconds  ← SAME DATA!
─────────────────────────────────────────────────────────
TOTAL                  │    26      │ ~6 seconds
```

Notice step 4: We fetched the **exact same Inflation data** we already had!

### The Solution

```
User Journey (AFTER caching):
─────────────────────────────────────────────────────────
Tab                    │ API Calls  │ Total Time
─────────────────────────────────────────────────────────
1. Load app            │     8      │ ~2 seconds
2. Click "Inflation"   │     7      │ ~1.5 seconds
3. Click "Employment"  │     4      │ ~1 second
4. Click "Inflation"   │     0      │ ~0.01 seconds ← FROM CACHE!
─────────────────────────────────────────────────────────
TOTAL                  │    19      │ ~4.5 seconds
```

**Benefits:**
- **~30% fewer API calls** in a typical session
- **Instant tab switching** after first visit
- **Data persists** even if you refresh the page
- **Respects FRED rate limits** (120 requests/minute)

---

## How Our Cache Works

### Two-Tier Architecture

We use TWO storage locations for maximum speed and persistence:

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Browser                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────┐                                   │
│   │   Memory Cache      │  ← Tier 1: FASTEST                │
│   │   (JavaScript Map)  │    - Access: ~0.001ms             │
│   │                     │    - Lost on page refresh         │
│   └─────────────────────┘                                   │
│              │                                               │
│              ▼                                               │
│   ┌─────────────────────┐                                   │
│   │   localStorage      │  ← Tier 2: PERSISTENT             │
│   │   (Browser Storage) │    - Access: ~1-5ms               │
│   │                     │    - Survives page refresh        │
│   └─────────────────────┘                                   │
│              │                                               │
│              ▼                                               │
│   ┌─────────────────────┐                                   │
│   │   FRED API          │  ← Tier 3: SOURCE (slowest)       │
│   │   (Internet)        │    - Access: ~500-2000ms          │
│   │                     │    - Always has latest data       │
│   └─────────────────────┘                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Cache Flow Diagram

When you request data (e.g., Federal Funds Rate):

```
getFredSeriesCached('FEDFUNDS')
           │
           ▼
    ┌──────────────┐
    │ Check Memory │
    │    Cache     │
    └──────┬───────┘
           │
     Found & Valid?
           │
    ┌──────┴──────┐
    │             │
   YES           NO
    │             │
    ▼             ▼
  Return    ┌──────────────┐
   data     │    Check     │
            │ localStorage │
            └──────┬───────┘
                   │
             Found & Valid?
                   │
            ┌──────┴──────┐
            │             │
           YES           NO
            │             │
            ▼             ▼
     Store in       ┌──────────────┐
     memory &  ←─── │  Fetch from  │
     return         │   FRED API   │
                    └──────┬───────┘
                           │
                           ▼
                    Store in BOTH
                    memory & localStorage
                           │
                           ▼
                       Return data
```

### Cache Key Strategy

Each cached entry is identified by a unique key:

```
Key Format: {seriesId}_{startDate}

Examples:
- "FEDFUNDS_2024-01-01"  → Fed Funds data starting Jan 2024
- "UNRATE_default"       → Unemployment Rate with no date filter
- "VIXCLS_2023-06-15"    → VIX data starting June 2023
```

This ensures different date ranges for the same series are cached separately.

### TTL (Time To Live)

Our cache expires after **24 hours**. Why 24 hours?

- FRED data typically updates **once per day**
- Most economic indicators are released monthly
- 24 hours balances freshness vs. performance

```javascript
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                 ↑    ↑    ↑    ↑
                 │    │    │    └── milliseconds per second
                 │    │    └─────── seconds per minute
                 │    └────────────  minutes per hour
                 └─────────────────  hours
```

---

## Code Walkthrough

### File: `app/lib/fredCache.ts`

This is the heart of our caching system:

```typescript
/**
 * Structure of a cached entry
 */
interface CacheEntry {
  data: FredSeriesData[];  // The actual data we're caching
  timestamp: number;       // When we cached it (for expiration)
  seriesId: string;        // Which series (for debugging)
}
```

**The main class:**

```typescript
class FredCache {
  // Tier 1: In-memory storage (Map is like a dictionary)
  private memoryCache: Map<string, CacheEntry> = new Map();

  // How long data stays valid
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Prefix to avoid conflicts with other apps using localStorage
  private readonly STORAGE_PREFIX = 'fred_cache_';
```

**The get() method (checking for cached data):**

```typescript
get(seriesId: string, startDate?: string): FredSeriesData[] | null {
  const cacheKey = this.getCacheKey(seriesId, startDate);

  // STEP 1: Check memory (fastest)
  const memoryEntry = this.memoryCache.get(cacheKey);
  if (memoryEntry && !this.isExpired(memoryEntry.timestamp)) {
    return memoryEntry.data;  // Cache hit!
  }

  // STEP 2: Check localStorage (slower but persistent)
  const storedJson = localStorage.getItem(this.STORAGE_PREFIX + cacheKey);
  if (storedJson) {
    const entry = JSON.parse(storedJson);
    if (!this.isExpired(entry.timestamp)) {
      // Also store in memory for next time
      this.memoryCache.set(cacheKey, entry);
      return entry.data;  // Cache hit!
    }
  }

  // STEP 3: Cache miss - will need to fetch from API
  return null;
}
```

### File: `app/lib/fredApi.ts`

The cached fetch function:

```typescript
export async function getFredSeriesCached(
  seriesId: string,
  startDate?: string
): Promise<FredSeriesData[]> {
  // Step 1: Try the cache first
  const cached = fredCache.get(seriesId, startDate);
  if (cached) {
    return cached;  // Fast path - no API call!
  }

  // Step 2: Cache miss - fetch from API
  const data = await getFredSeries(seriesId, startDate);

  // Step 3: Store for next time
  fredCache.set(seriesId, startDate, data);

  return data;
}
```

---

## Key Concepts for Beginners

### 1. Cache Hit vs. Cache Miss

- **Cache Hit**: Data found in cache, no API call needed
- **Cache Miss**: Data not in cache, must fetch from API

```
Console output you'll see:

✅ [CACHE] HIT (memory): FEDFUNDS - 12 points     ← Fast!
🔍 [CACHE] MISS: VIXCLS - will fetch from API     ← Slow, but stores for later
💾 [CACHE] STORED: VIXCLS - 12 data points        ← Now cached!
```

### 2. Cache Invalidation

> "There are only two hard things in Computer Science: cache invalidation and naming things."
> — Phil Karlton

**Cache invalidation** means deciding when to throw away old cached data. We use:

- **TTL (Time-Based)**: Data expires after 24 hours
- **Manual Clear**: User clicks "Refresh Data" button

### 3. Trade-offs

| Approach | Freshness | Speed | Complexity |
|----------|-----------|-------|------------|
| No cache | Always fresh | Slow | Simple |
| Our approach | Up to 24h stale | Fast | Medium |
| Real-time | Always fresh | Fast | Complex (WebSocket) |

### 4. Memory vs. Storage

| Feature | Memory (Map) | localStorage |
|---------|-------------|--------------|
| Speed | ~0.001ms | ~1-5ms |
| Survives refresh | No | Yes |
| Storage limit | ~Unlimited* | ~5-10MB |
| Cleared when | Tab closes | Manually/Expires |

*Limited by available RAM

---

## Testing the Cache

### How to Verify It's Working

1. **Open Developer Tools** (F12 or Cmd+Option+I)

2. **Go to Console tab** - You'll see cache logs:
   ```
   ✅ [CACHE] HIT (memory): FEDFUNDS - 12 points
   🔍 [CACHE] MISS: UNRATE - will fetch from API
   💾 [CACHE] STORED: UNRATE - 12 data points
   ```

3. **Go to Network tab** - Watch API calls:
   - First visit to a tab: You'll see network requests
   - Second visit: NO network requests (cached!)

4. **Go to Application tab** → Local Storage:
   - Look for keys starting with `fred_cache_`
   - You can see the cached data!

### Manual Testing Steps

```
1. Load the app
2. Click "Inflation" tab → Watch Console: MISS messages
3. Click "Employment" tab → Watch Console: MISS messages
4. Click "Inflation" tab → Watch Console: HIT messages!
5. Refresh the page
6. Click "Inflation" tab → Watch Console: HIT (localStorage)!
7. Click "Refresh Data" button
8. Click "Inflation" tab → Watch Console: MISS (cache cleared)
```

### Check Cache Statistics

Open the browser console and type:

```javascript
// In browser console:
fredCache.getStats()
// Returns: { memoryEntries: 5, localStorageEntries: 5, hitCount: 12, missCount: 8 }

fredCache.getHitRate()
// Returns: 60 (meaning 60% of requests were served from cache)
```

---

## Further Learning

### Caching Fundamentals

- **[MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)** - Official documentation for localStorage
- **[JavaScript.info: LocalStorage](https://javascript.info/localstorage)** - Beginner-friendly tutorial
- **[Caching Best Practices](https://web.dev/articles/http-cache)** - Google's guide to caching

### React Data Fetching & Caching Libraries

- **[TanStack Query (React Query)](https://tanstack.com/query/latest)** - Industry-standard caching for React
- **[SWR by Vercel](https://swr.vercel.app/)** - Stale-while-revalidate approach
- **[RTK Query](https://redux-toolkit.js.org/rtk-query/overview)** - Redux-based data fetching

### Advanced Caching Patterns

- **[Stale-While-Revalidate](https://web.dev/articles/stale-while-revalidate)** - Return stale data while fetching fresh
- **[Cache Stampede Prevention](https://en.wikipedia.org/wiki/Cache_stampede)** - Preventing thundering herd
- **[Redis Caching Strategies](https://redis.io/docs/manual/patterns/)** - Server-side caching patterns

### FRED API

- **[FRED API Documentation](https://fred.stlouisfed.org/docs/api/fred/)** - Official API docs
- **[FRED API Rate Limits](https://fred.stlouisfed.org/docs/api/fred/#API_Limits)** - 120 requests/minute
- **[FRED Series Database](https://fred.stlouisfed.org/)** - Browse available data series

### Video Resources

- **[Fireship: Caching Explained in 100 Seconds](https://www.youtube.com/watch?v=6FyXURRVmR0)** - Quick overview
- **[The Coding Train: Working with Data and APIs](https://www.youtube.com/playlist?list=PLRqwX-V7Uu6YxDKpFzf_2D84p0cyk4T7X)** - Beginner JavaScript APIs

---

## Summary

### What We Built

A two-tier caching system that:
1. Stores FRED API data in memory (fast) and localStorage (persistent)
2. Reduces API calls by ~30% or more
3. Makes tab switching instant after first visit
4. Automatically expires data after 24 hours
5. Provides a manual "Refresh Data" button

### Files Changed

| File | Purpose |
|------|---------|
| `app/lib/fredCache.ts` | Cache implementation (new) |
| `app/lib/fredApi.ts` | Added `getFredSeriesCached()` function |
| `app/page.tsx` | Changed all fetches to use cached version |
| `app/components/Sidebar.tsx` | Added "Refresh Data" button |

### Key Takeaways

1. **Caching trades freshness for speed** - acceptable when data doesn't change often
2. **Two-tier caching** gives us both speed (memory) and persistence (localStorage)
3. **TTL ensures eventual freshness** - stale data is automatically replaced
4. **Always provide a manual refresh** - users should be able to get fresh data

---

*Document created: January 2026*
*Project: FRED Economic Indicators Dashboard*
