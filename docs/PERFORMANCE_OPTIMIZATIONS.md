# Feature 1.4: Performance Optimizations

## Learning Guide for JavaScript/TypeScript Performance

This guide provides a **bottom-up learning approach** to understanding and implementing performance optimizations in React/Next.js applications. It's designed for beginners who want to learn by doing, with AI guidance along the way.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Learning Path](#learning-path)
4. [Core Concepts](#core-concepts)
5. [Implementation Status](#implementation-status)
6. [Hands-On Experiments](#hands-on-experiments)
7. [Working with AI for Learning](#working-with-ai-for-learning)
8. [Further Reading](#further-reading)

---

## Overview

### Why Performance Matters

```
Poor Performance:                 Optimized:
┌─────────────────────────┐      ┌─────────────────────────┐
│ User clicks tab          │      │ User clicks tab          │
│       ↓                  │      │       ↓                  │
│ 5 API calls (3s)         │      │ 1 cached call (50ms)     │
│       ↓                  │      │       ↓                  │
│ 40 component re-renders  │      │ 2 component re-renders   │
│       ↓                  │      │       ↓                  │
│ User sees data (5s+)     │      │ User sees data (100ms)   │
└─────────────────────────┘      └─────────────────────────┘
```

### The Real Problems We're Solving

| Problem | Impact | Solution |
|---------|--------|----------|
| **Duplicate API calls** | Rate limiting, slow loads | Request Coalescing |
| **40+ useState hooks** | Every update re-renders everything | Custom Hooks |
| **Unnecessary re-renders** | Wasted CPU, janky UI | React.memo, useMemo |
| **Object recreation** | Reference changes trigger renders | Memoization |

---

## Prerequisites

Before diving in, make sure you understand these foundational concepts:

### Level 1: JavaScript Fundamentals

```javascript
// 1. Promises and async/await
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}

// 2. Object references
const a = { x: 1 };
const b = { x: 1 };
console.log(a === b);  // false! Different objects in memory

const c = a;
console.log(a === c);  // true! Same reference

// 3. Map data structure
const cache = new Map();
cache.set('key', 'value');
cache.get('key');  // 'value'
cache.has('key');  // true
```

**AI Prompt to Learn More:**
> "Explain JavaScript object references with examples. Why does `{} === {}` return false?"

### Level 2: React Fundamentals

```tsx
// 1. useState - component state
const [count, setCount] = useState(0);

// 2. useEffect - side effects
useEffect(() => {
  fetchData();
}, [dependency]);  // Runs when dependency changes

// 3. Component lifecycle
function Component() {
  console.log('Rendering...');  // Runs EVERY render
  return <div>Hello</div>;
}
```

**AI Prompt to Learn More:**
> "When does a React component re-render? What triggers a re-render?"

### Level 3: TypeScript Basics

```typescript
// 1. Generics - type parameters
function identity<T>(value: T): T {
  return value;
}

// 2. Interfaces
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

// 3. Type annotations
const cache = new Map<string, CacheEntry>();
```

**AI Prompt to Learn More:**
> "Explain TypeScript generics with a simple caching example."

---

## Learning Path

Follow this path for structured learning:

```
Week 1: Foundations
├── Day 1-2: JavaScript Event Loop & Promises
├── Day 3-4: React Rendering Lifecycle
└── Day 5-7: Read existing codebase (fredCache.ts, fredApi.ts)

Week 2: Implementation
├── Day 1-2: Request Coalescing (Promise sharing)
├── Day 3-4: React.memo and useMemo
└── Day 5-7: Custom Hooks

Week 3: Validation
├── Day 1-2: Write unit tests
├── Day 3-4: Profile with React DevTools
└── Day 5-7: Network analysis
```

---

## Core Concepts

### Concept 1: The JavaScript Event Loop

JavaScript is **single-threaded** but handles async operations efficiently through the Event Loop.

```typescript
/**
 * Event Loop Order:
 * 1. Execute synchronous code (call stack)
 * 2. Process microtasks (Promises, queueMicrotask)
 * 3. Process macrotasks (setTimeout, I/O)
 * 4. Render (if needed)
 * 5. Repeat
 */

// BAD: Sequential requests (SLOW)
async function fetchSequential() {
  const a = await fetch('/api/a');  // Wait 500ms
  const b = await fetch('/api/b');  // Wait 500ms
  const c = await fetch('/api/c');  // Wait 500ms
  // Total: 1500ms
}

// GOOD: Parallel requests (FAST)
async function fetchParallel() {
  const [a, b, c] = await Promise.all([
    fetch('/api/a'),  // Start immediately
    fetch('/api/b'),  // Start immediately
    fetch('/api/c'),  // Start immediately
  ]);
  // Total: 500ms (slowest one)
}
```

**Self-Learning Exercise:**
1. Open browser DevTools Console
2. Run this code and observe the order:
```javascript
console.log('1: Sync');
setTimeout(() => console.log('2: Timeout'), 0);
Promise.resolve().then(() => console.log('3: Promise'));
console.log('4: Sync');
// Output: 1, 4, 3, 2 (Why?)
```

**AI Prompt:**
> "Explain why the console.log output is 1, 4, 3, 2 in the code above. What's the difference between microtasks and macrotasks?"

---

### Concept 2: Referential Equality

React uses `Object.is()` to compare values. Objects/arrays/functions create **NEW references** on every render!

```typescript
function Component() {
  // BAD: New object every render = children re-render
  const style = { color: 'blue' };

  // GOOD: Memoized object
  const style = useMemo(() => ({ color: 'blue' }), []);

  // BAD: New function every render
  const handleClick = () => console.log('clicked');

  // GOOD: Stable function reference
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
}
```

**Why This Matters:**
```typescript
// Parent re-renders → Creates new handleClick → Child sees new prop → Child re-renders
// Even though handleClick does the exact same thing!
```

**Self-Learning Exercise:**
```javascript
// Run in console:
const obj1 = { x: 1 };
const obj2 = { x: 1 };
const obj3 = obj1;

console.log(obj1 === obj2);  // ?
console.log(obj1 === obj3);  // ?
console.log(Object.is(obj1, obj2));  // ?
```

---

### Concept 3: Request Coalescing (Promise Sharing)

**The Problem:**
```
Component A: fetch('/api/signals') ─┐
Component B: fetch('/api/signals') ─┼─> 3 separate API calls!
Component C: fetch('/api/signals') ─┘
```

**The Solution:**
```typescript
/**
 * Share ONE promise across all requesters
 *
 * Think of it like ordering pizza:
 * - Bad: Each friend orders a separate pizza
 * - Good: One friend orders, everyone shares
 */

const inFlightRequests = new Map<string, Promise<unknown>>();

export async function fetchWithCoalescing<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // If already fetching, return existing promise
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  // Start new fetch
  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);  // Clean up when done
  });

  inFlightRequests.set(key, promise);
  return promise;
}
```

**How It Works:**
```
Time 0ms: Component A calls fetchWithCoalescing('FEDFUNDS', ...)
          → No existing request, start new one
          → Store promise in Map

Time 1ms: Component B calls fetchWithCoalescing('FEDFUNDS', ...)
          → Found existing request!
          → Return same promise (no new API call)

Time 2ms: Component C calls fetchWithCoalescing('FEDFUNDS', ...)
          → Return same promise again

Time 500ms: API returns data
            → All 3 components receive the same data
            → Only 1 API call was made!
```

**AI Prompt:**
> "Explain the difference between request deduplication and caching. When would you use each?"

---

### Concept 4: React.memo

Wraps a component to prevent re-renders when props haven't changed.

```typescript
// WITHOUT memo: Renders every time parent renders
function SignalGauge({ value }: { value: number }) {
  console.log('SignalGauge rendered');
  return <div>Value: {value}</div>;
}

// WITH memo: Only renders when value changes
const SignalGauge = memo(function SignalGauge({ value }: { value: number }) {
  console.log('SignalGauge rendered');
  return <div>Value: {value}</div>;
});

// For object props, add custom comparison:
const SignalCard = memo(
  function SignalCard({ signal }: { signal: Signal }) {
    return <div>{signal.name}: {signal.value}</div>;
  },
  (prevProps, nextProps) => {
    // Return true = DON'T re-render
    return prevProps.signal.value === nextProps.signal.value &&
           prevProps.signal.updatedAt === nextProps.signal.updatedAt;
  }
);
```

---

### Concept 5: Custom Hooks

Extract reusable stateful logic into dedicated functions.

```typescript
/**
 * BEFORE: 40+ useState in page.tsx
 */
function Page() {
  const [cpiData, setCpiData] = useState([]);
  const [pceData, setPceData] = useState([]);
  const [unemploymentData, setUnemploymentData] = useState([]);
  // ... 37 more states!
}

/**
 * AFTER: Domain-specific hooks
 */
function Page() {
  const inflation = useInflationData(activeSection === 'inflation');
  const employment = useEmploymentData(activeSection === 'employment');
  // Clean and organized!
}

// The custom hook encapsulates all related logic
function useInflationData(isActive: boolean) {
  const [cpi, setCpi] = useState([]);
  const [pce, setPce] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    // Fetch data...
  }, [isActive]);

  // Memoize transformations
  const chartData = useMemo(() => formatData(cpi, pce), [cpi, pce]);

  return { cpi, pce, chartData, loading };
}
```

---

## Implementation Status

### Completed (Phase 1 & 3)

| Feature | File | Status |
|---------|------|--------|
| Request Coalescing | `app/lib/requestCoalescer.ts` | ✅ Done |
| FRED API Integration | `app/lib/fredApi.ts` | ✅ Done |
| Coalescer Tests | `app/lib/__tests__/requestCoalescer.test.ts` | ✅ 17 tests |
| SignalCard Memo | `app/components/trading-signals/SignalCard.tsx` | ✅ Done |
| SignalGauge Memo | `app/components/trading-signals/SignalGauge.tsx` | ✅ Done |
| Debug Mode Disabled | `app/lib/fredCache.ts` | ✅ Done |

### Pending (Phase 2)

| Feature | File | Status |
|---------|------|--------|
| useInflationData | `app/hooks/useInflationData.ts` | ❌ Not Started |
| useEmploymentData | `app/hooks/useEmploymentData.ts` | ❌ Not Started |
| useHousingData | `app/hooks/useHousingData.ts` | ❌ Not Started |
| page.tsx Refactor | `app/page.tsx` | ❌ Not Started |

---

## Hands-On Experiments

### Experiment 1: Visualize Re-renders

**Goal:** See how React components re-render

```typescript
// Add this to any component:
function Component() {
  const renderCount = useRef(0);
  renderCount.current++;

  console.log(`Component rendered ${renderCount.current} times`);

  return <div>...</div>;
}
```

**Steps:**
1. Add render counting to `SignalCard.tsx`
2. Navigate between dashboard tabs
3. Check console - how many times does it render?
4. Add React.memo and compare

**AI Prompt:**
> "I added render counting and my component renders 50 times when switching tabs. How do I use React.memo to reduce this?"

---

### Experiment 2: Test Request Coalescing

**Goal:** Verify only one API call is made for duplicate requests

```typescript
// Run in your test file or console:
import { fetchWithCoalescing, getInFlightCount } from '@/app/lib/requestCoalescer';

async function testCoalescing() {
  let apiCallCount = 0;

  const mockFetch = async () => {
    apiCallCount++;
    console.log(`API call #${apiCallCount}`);
    await new Promise(r => setTimeout(r, 100));
    return { data: 'test' };
  };

  // Start 5 "simultaneous" requests
  const promises = [
    fetchWithCoalescing('test', mockFetch),
    fetchWithCoalescing('test', mockFetch),
    fetchWithCoalescing('test', mockFetch),
    fetchWithCoalescing('test', mockFetch),
    fetchWithCoalescing('test', mockFetch),
  ];

  console.log('In-flight requests:', getInFlightCount());  // Should be 1

  await Promise.all(promises);
  console.log('Total API calls:', apiCallCount);  // Should be 1, not 5!
}

testCoalescing();
```

---

### Experiment 3: Measure useMemo Impact

**Goal:** Compare performance with and without memoization

```typescript
// Create two versions:
function SlowComponent({ data, unrelatedProp }) {
  // Runs every render, even when only unrelatedProp changes
  const processed = data.map(d => expensiveTransform(d));
  return <div>{processed.length} items</div>;
}

function FastComponent({ data, unrelatedProp }) {
  // Only runs when data changes
  const processed = useMemo(
    () => data.map(d => expensiveTransform(d)),
    [data]
  );
  return <div>{processed.length} items</div>;
}

// Test by changing unrelatedProp rapidly
// Measure render time with React DevTools Profiler
```

---

### Experiment 4: Network Waterfall Analysis

**Goal:** Visualize request parallelization

**Steps:**
1. Open Chrome DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Navigate to inflation section
4. Look at the waterfall chart

**Good Pattern (Parallel):**
```
GET /api/fred?series=CPI     ════════════════════
GET /api/fred?series=PCE     ════════════════════
GET /api/fred?series=CORE    ════════════════════
Total: ~500ms (slowest request)
```

**Bad Pattern (Sequential):**
```
GET /api/fred?series=CPI     ════════════════════
                             GET /api/fred?series=PCE     ════════════════════
                                                          GET /api/fred?series=CORE     ═══
Total: ~1500ms (sum of all requests)
```

---

### Experiment 5: Cache Hit Rate

**Goal:** Understand caching effectiveness

```typescript
// Run in browser console after navigating the dashboard:
import { fredCache } from '@/app/lib/fredCache';

const stats = fredCache.getStats();
console.table({
  'Memory Entries': stats.memoryEntries,
  'localStorage Entries': stats.localStorageEntries,
  'Cache Hits': stats.hitCount,
  'Cache Misses': stats.missCount,
  'Hit Rate': `${fredCache.getHitRate()}%`
});

// Expected hit rates:
// - First visit: 0% (cold cache)
// - After browsing: 70-90%
// - Return visit: 90%+ (localStorage persists)
```

---

## Working with AI for Learning

### How to Ask Good Questions

**Instead of:** "How do I make my app faster?"

**Ask:** "My React component re-renders 50 times when I switch tabs. Here's the code: [paste code]. How can I use React.memo to reduce unnecessary re-renders?"

### Effective Learning Prompts

| Goal | AI Prompt |
|------|-----------|
| Understand a concept | "Explain JavaScript Promises using a real-world analogy. Include code examples." |
| Debug an issue | "My useEffect runs in an infinite loop. Here's the code: [code]. What dependency is causing this?" |
| Compare approaches | "Compare useMemo vs useCallback. When should I use each? Give examples." |
| Learn by doing | "Give me 3 exercises to practice React.memo, from easy to hard." |
| Code review | "Review this requestCoalescer implementation. What edge cases am I missing?" |

### Iterative Learning Pattern

```
1. READ: Read existing code (fredCache.ts)
   AI Prompt: "Explain what this code does line by line: [paste code]"

2. EXPERIMENT: Modify and observe
   AI Prompt: "What happens if I remove the .finally() cleanup in fetchWithCoalescing?"

3. IMPLEMENT: Write your own version
   AI Prompt: "Help me write a simpler version of request coalescing for learning."

4. TEST: Write tests to verify understanding
   AI Prompt: "What test cases should I write to verify my coalescer handles errors correctly?"

5. EXTEND: Add features
   AI Prompt: "How would I add a maximum queue size limit to prevent memory issues?"
```

### When Stuck

```
AI Prompt Template:
"I'm trying to [goal].
Here's what I've tried: [your attempt]
Here's the error/issue: [what went wrong]
Here's the relevant code: [paste code]
What am I missing?"
```

---

## Further Reading

### Official Documentation
- [React useMemo](https://react.dev/reference/react/useMemo)
- [React.memo](https://react.dev/reference/react/memo)
- [React useCallback](https://react.dev/reference/react/useCallback)
- [JavaScript Promises (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)

### Project Files to Study
- `app/lib/fredCache.ts` - Two-tier caching implementation
- `app/lib/requestCoalescer.ts` - Promise deduplication
- `app/lib/__tests__/requestCoalescer.test.ts` - Test patterns
- `app/components/trading-signals/SignalCard.tsx` - React.memo with custom comparison

### AI Learning Sessions

**Session 1: JavaScript Async**
> "Create a 30-minute lesson on JavaScript Promises, async/await, and Promise.all. Include exercises."

**Session 2: React Rendering**
> "Create a lesson on React's rendering behavior. Explain what triggers re-renders and how to prevent unnecessary ones."

**Session 3: Memoization Deep Dive**
> "Explain memoization from first principles. Start with a simple cache, then show useMemo and React.memo."

---

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `app/lib/requestCoalescer.ts` | Promise deduplication utility |
| `app/lib/fredCache.ts` | Two-tier cache (memory + localStorage) |
| `app/lib/fredApi.ts` | FRED API with caching integration |
| `app/components/trading-signals/SignalCard.tsx` | Memoized component example |
| `app/components/trading-signals/SignalGauge.tsx` | Pure component with React.memo |

### Optimization Checklist

- [ ] Use `Promise.all()` for parallel requests
- [ ] Implement request coalescing for duplicate calls
- [ ] Wrap expensive components with `React.memo`
- [ ] Memoize object/array props with `useMemo`
- [ ] Memoize callbacks with `useCallback`
- [ ] Extract related state into custom hooks
- [ ] Profile with React DevTools before/after

### Testing Commands

```bash
# Run all tests
npm run test:run

# Run specific test file
npm run test:run -- requestCoalescer

# Run tests in watch mode
npm run test

# Check lint
npm run lint
```

---

*Last updated: January 2026*
*Part of the Trading Bot Research Project - Feature 1.4*
