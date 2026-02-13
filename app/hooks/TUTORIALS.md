# Custom Hooks: Beginner Tutorials

Four step-by-step tutorials explaining the **WHY** behind each hook pattern.
Each tutorial includes the problem it solves, a code walkthrough, comprehension
questions, and common pitfalls.

## Table of Contents

1. [Simple Hook Pattern](#tutorial-1-simple-hook-pattern-useemploymentdata)
2. [Mixed Date Range Pattern](#tutorial-2-mixed-date-range-pattern-useeconomicgrowthdata)
3. [Merged Series Pattern](#tutorial-3-merged-series-pattern-useconsumerspendingdata)
4. [Always-On Hook Pattern](#tutorial-4-always-on-hook-pattern-usekeyindicatorsdata)

> **Prerequisites:** Read [`HOOKS.md`](./HOOKS.md) for an architecture overview
> before working through these tutorials.

---

# Tutorial 1: Simple Hook Pattern (useEmploymentData)

## What You'll Learn

This tutorial walks through `useEmploymentData`, the simplest hook pattern. You'll
learn:
- Why 4 employment series are grouped together
- How the isActive guard prevents unnecessary API calls
- Why formatMonthly is used instead of other formats
- How error handling works end-to-end

---

## The Problem This Hook Solves

Before custom hooks, the employment section in `page.tsx` looked like this:

```typescript
// 5 separate state declarations
const [laborForceData, setLaborForceData] = useState<ChartData[]>([]);
const [payrollsData, setPayrollsData] = useState<ChartData[]>([]);
const [initialClaimsData, setInitialClaimsData] = useState<ChartData[]>([]);
const [hourlyEarningsData, setHourlyEarningsData] = useState<ChartData[]>([]);
const [employmentLoading, setEmploymentLoading] = useState(false);

// ~30-line useEffect
useEffect(() => {
  if (activeSection !== 'employment') return;
  setEmploymentLoading(true);
  // ... fetch 4 series, format each, call 4 setters ...
}, [activeSection]);
```

**Issues:**
- 5 separate state variables for logically related data
- Copy-pasted formatting logic (`.toLocaleDateString` repeated 4 times)
- Hard to reuse in other components (tightly coupled to page.tsx)
- No easy way to test in isolation

## The Solution

```typescript
// One hook call replaces 5 useState + 1 useEffect
const employment = useEmploymentData(activeSection === 'employment');

// Usage:
<Chart data={employment.data.laborForce} loading={employment.loading} />
```

---

## Walking Through the Code

### Step 1: State Management

```typescript
const [data, setData] = useState<EmploymentData>({
  laborForce: [],
  payrolls: [],
  initialClaims: [],
  hourlyEarnings: [],
});
const [loading, setLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);
```

**Why group into one `data` object?**

Employment metrics are conceptually related — they all describe the job market.
Keeping them in one object:
- Makes the return type predictable (`DomainHookResult<EmploymentData>`)
- Ensures all 4 series update atomically (one `setData` call, not 4)
- Simplifies the component API (`employment.data.X` vs 4 separate props)

**Why separate loading and error?**

The three states are orthogonal:
- `loading: true` during fetch, `false` after
- `error: null` on success, `Error` object on failure
- `data: { ... }` always has a shape (empty arrays initially, populated on success)

This tri-state model maps cleanly to UI:
```typescript
if (loading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
return <Charts data={data} />;
```

---

### Step 2: isActive Guard

```typescript
export function useEmploymentData(isActive: boolean): DomainHookResult<EmploymentData> {
  // ...
  useEffect(() => {
    if (!isActive) return;  // ← This line is critical
    loadData();
  }, [isActive, oneYearAgo, formatMonthly]);
}
```

**Why `isActive` instead of hardcoding `activeSection === 'employment'`?**

Separation of concerns:
- **The hook** knows *how* to fetch employment data
- **The component** knows *when* employment data should be fetched

This makes the hook reusable:
```typescript
// In page.tsx (tabs)
const employment = useEmploymentData(activeSection === 'employment');

// In a dashboard (always show)
const employment = useEmploymentData(true);

// In a lazy-loaded modal (show when open)
const employment = useEmploymentData(modalOpen);
```

The hook doesn't care *why* it's active, just *whether* it is.

**What happens when `isActive` is false?**

The `useEffect` runs (because `isActive` is in the dependency array), but hits the
early `return` immediately. No API calls are made. No state is updated. Zero cost.

When `isActive` changes from `false` → `true`, the effect runs again, this time
past the guard, and `loadData()` executes.

---

### Step 3: Shared Utilities (useDateRange, useDataFormatter)

```typescript
const { oneYearAgo } = useDateRange();
const { formatMonthly } = useDataFormatter();
```

**Why not calculate dates inline?**

❌ This causes an infinite loop:
```typescript
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
const dateStr = oneYearAgo.toISOString().split('T')[0];

useEffect(() => {
  loadData();
}, [isActive, dateStr]);  // ← dateStr is a NEW string every render
```

**What happens:**
1. Component renders → `dateStr` created (e.g., `"2025-02-06"`)
2. `useEffect` sees dependency `dateStr` changed (new string object)
3. Effect runs → calls `setLoading` → triggers re-render
4. Go to step 1 → infinite loop

**Solution: `useMemo` in `useDateRange`**

```typescript
// useDateRange.ts
return useMemo(() => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return { oneYearAgo: oneYearAgo.toISOString().split('T')[0] };
}, []);  // Empty deps = compute once, return same object every render
```

Now `oneYearAgo` is the **same object reference** across renders. The `useEffect`
dependency check sees "no change" and doesn't re-run.

**Same pattern for `formatMonthly`:**

Functions need `useCallback` instead of `useMemo`:
```typescript
const formatMonthly = useCallback((data: FredSeriesData[]): ChartData[] => {
  return data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
    value: parseFloat(d.value),
  }));
}, []);
```

Without `useCallback`, `formatMonthly` would be a **new function** every render.
Same infinite loop problem.

---

### Step 4: Parallel Fetching with Promise.all

```typescript
const [laborForce, payrolls, initialClaims, hourlyEarnings] = await Promise.all([
  getFredSeriesCached('CIVPART', oneYearAgo),       // Labor Force Participation
  getFredSeriesCached('PAYEMS', oneYearAgo),        // Nonfarm Payrolls
  getFredSeriesCached('ICSA', oneYearAgo),          // Initial Jobless Claims
  getFredSeriesCached('AHETPI', oneYearAgo),        // Hourly Earnings
]);
```

**Why `Promise.all` instead of sequential `await`?**

Sequential is slower:
```typescript
const laborForce = await getFredSeriesCached('CIVPART', oneYearAgo);  // 200ms
const payrolls   = await getFredSeriesCached('PAYEMS', oneYearAgo);   // 200ms
const claims     = await getFredSeriesCached('ICSA', oneYearAgo);     // 200ms
const earnings   = await getFredSeriesCached('AHETPI', oneYearAgo);   // 200ms
// Total: 800ms
```

Parallel is faster:
```typescript
const [laborForce, payrolls, claims, earnings] = await Promise.all([...]);
// All 4 requests fire simultaneously
// Total: ~200ms (time of the slowest request)
```

**Trade-off: All-or-Nothing**

If any single request fails, the entire `Promise.all` rejects:
```typescript
Promise.all([
  getFredSeriesCached('CIVPART', oneYearAgo),       // succeeds
  getFredSeriesCached('INVALID_CODE', oneYearAgo),  // fails
  getFredSeriesCached('ICSA', oneYearAgo),          // succeeds
]);
// Result: Promise.all throws, all 3 results are lost
```

The `catch` block handles this uniformly — if any series fails, the entire section
errors. This is intentional: partial employment data (e.g., only labor force,
missing payrolls) would be confusing to users.

**Future improvement:** `Promise.allSettled` would allow partial data display.

---

### Step 5: Data Formatting

```typescript
setData({
  laborForce:    formatMonthly(laborForce),
  payrolls:      formatMonthly(payrolls),
  initialClaims: formatMonthly(initialClaims),
  hourlyEarnings: formatMonthly(hourlyEarnings),
});
```

**What does `formatMonthly` do?**

FRED returns data like this:
```typescript
[
  { date: "2024-01-01", value: "63.4" },  // ← ISO date, string value
  { date: "2024-02-01", value: "63.5" },
]
```

Charts need this:
```typescript
[
  { date: "Jan", value: 63.4 },  // ← short month, numeric value
  { date: "Feb", value: 63.5 },
]
```

`formatMonthly` transforms:
```typescript
const formatMonthly = (data: FredSeriesData[]): ChartData[] =>
  data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
    value: parseFloat(d.value),
  }));
```

**Why `parseFloat`?**

FRED returns values as strings (JSON limitation). Charts need numbers for the
Y-axis. `parseFloat("63.4")` → `63.4`.

**Why "short" month format?**

X-axis labels like "Jan", "Feb" fit better than "January", "February" (too wide)
or "2024-01-01" (too verbose). For 12 months of data, short names are ideal.

---

### Step 6: Error Handling

```typescript
} catch (err) {
  setError(err instanceof Error ? err : new Error('Failed to load employment data'));
  console.error('Error loading employment data:', err);
} finally {
  setLoading(false);
}
```

**Why `instanceof Error` check?**

TypeScript types `catch` block errors as `unknown` because JavaScript allows
throwing any value:
```typescript
throw new Error('message');  // Error object
throw 'plain string';        // string
throw 42;                    // number
throw { custom: 'object' };  // object
```

The `error` state is typed as `Error | null`. We can't store a string or number
there. The check:
- If `err` is already an `Error` → use it (preserves stack trace)
- If `err` is anything else → wrap it in a `new Error(...)` with a safe message

**Why `console.error` if we have error state?**

Redundant for users, but helpful for developers:
- **Error state** → shows user-facing message in UI
- **console.error** → logs full error details (stack trace, API response) for debugging

**Why `finally`?**

The loading spinner must stop whether the fetch succeeds or fails:
```typescript
try {
  setData(...);
} catch {
  setError(...);
} finally {
  setLoading(false);  // Runs whether try or catch executed
}
```

---

## Common Pitfalls

### Pitfall 1: Calling the Hook Without Checking `isActive`

❌ **Wrong:**
```typescript
// Always fires — 7 unnecessary API calls on every page load
const employment = useEmploymentData(true);
```

✅ **Correct:**
```typescript
const [activeSection, setActiveSection] = useState('key-indicators');
const employment = useEmploymentData(activeSection === 'employment');
```

**Why it matters:** Passing `true` unconditionally fires all 7 lazy hooks on page
load, regardless of which section the user actually opens.

---

### Pitfall 2: Accessing `data` Before Loading Completes

❌ **Wrong:**
```typescript
const employment = useEmploymentData(isActive);
// payrolls is [] until fetch completes — this throws
const first = employment.data.payrolls[0].value;
```

✅ **Correct:**
```typescript
if (employment.loading) return <Spinner />;
if (employment.error) return <ErrorMessage error={employment.error} />;
const first = employment.data.payrolls[0]?.value;
```

**Why it matters:** `data` starts as `{ payrolls: [], laborForce: [], ... }`.
Array items don't exist until the fetch resolves. Optional chaining (`?.`) is a
safety net, not a substitute for checking `loading` first.

---

### Pitfall 3: Missing Hook Result in `useEffect` Dependencies

❌ **Wrong:**
```typescript
const employment = useEmploymentData(isActive);
useEffect(() => {
  doSomethingWith(employment.data);
}, []);  // Stale closure — never re-runs when data arrives
```

✅ **Correct:**
```typescript
useEffect(() => {
  doSomethingWith(employment.data);
}, [employment.data]);
```

**Why it matters:** An empty deps array captures the initial (empty) `data` and
never re-runs. The effect sees `payrolls: []` forever.

---

### Pitfall 4: Expecting `isActive` Toggle to Skip the Cache

```typescript
// User visits Employment → Inflation → Employment:
// First visit:  fetch fires, data cached in memory
// Second visit: isActive goes false → true again → loadData() called again
// BUT: getFredSeriesCached returns instantly from cache — no network round-trip
```

**What this means:** Re-triggering the effect on `isActive` change is safe.
The cache layer in `getFredSeriesCached` ensures repeated calls are instant.

---

### Pitfall 5: Using Hook Outside a `'use client'` Component

❌ **Wrong:**
```typescript
// app/dashboard/page.tsx  ← Server Component by default in Next.js App Router
import { useEmploymentData } from '@/app/hooks';

export default function Page() {
  const employment = useEmploymentData(true);  // Error: hooks not allowed here
}
```

✅ **Correct:**
```typescript
'use client';
import { useEmploymentData } from '@/app/hooks';
```

**Why it matters:** All 8 domain hooks use `useState` and `useEffect`, which
require a browser runtime. The `'use client'` directive is required.

---

## Comprehension Questions

**Q1:** If you remove `useCallback` from `formatMonthly`, what happens? Trace through
the render cycle and explain the infinite loop.

**Q2:** The hook is called with `isActive: false`. Does `useEffect` run? Does `loadData`
run? Does `getFredSeriesCached` get called? Explain the sequence.

**Q3:** One FRED series (`PAYEMS`) fails with a 404 error. What does the user see?
What's in `employment.data.laborForce`? What's in `employment.error`?

**Q4:** A developer wants to show employment data on a mobile dashboard that has no
tabs (data always visible). How do they call `useEmploymentData`? Do they need to
modify the hook?

**Q5:** Why does this hook use `formatMonthly` instead of `formatIsoDate`? What would
break if you swapped them?

---

## Next Steps

Now that you understand the simple pattern, you can:
1. Read `useHousingData` and `useExchangeRatesData` — same pattern, more series
2. Move to Tutorial 2 (`useEconomicGrowthData`) to see how quarterly and monthly
   data are handled together
3. Implement your own simple hook for a new data domain

---

# Tutorial 2: Mixed Date Range Pattern (useEconomicGrowthData)

## What You'll Learn

This tutorial walks through `useEconomicGrowthData`, which introduces the
**Mixed Date Range Pattern**. You'll learn:
- Why quarterly data needs 2 years while monthly data needs only 1 year
- How to fetch different series with different date ranges in the same hook
- The difference between `formatQuarterly` and `formatMonthly`
- When to use which date range for your data

---

## The Problem This Hook Solves

Economic growth is measured using both quarterly and monthly indicators. Before
understanding the mixed date range pattern, developers often made this mistake:

```typescript
// ❌ WRONG: Using 1 year for all series
const { oneYearAgo } = useDateRange();

const [gdp, industrialProd] = await Promise.all([
  getFredSeriesCached('A191RL1Q225SBEA', oneYearAgo),  // GDP (quarterly)
  getFredSeriesCached('INDPRO', oneYearAgo),            // Industrial (monthly)
]);
```

**What's wrong with this?**

- **GDP (quarterly):** Only published 4 times per year (Q1, Q2, Q3, Q4)
  - 1 year of data = **4 data points**
  - Chart shows: `[Q1 '25, Q2 '25, Q3 '25, Q4 '25]`
  - **Too few points!** Trends are barely visible with only 4 dots

- **Industrial Production (monthly):** Published 12 times per year
  - 1 year of data = **12 data points**
  - Chart shows: `[Jan, Feb, Mar, ... Dec]`
  - **Perfect!** 12 points show clear trends

**The visual problem:**

When you plot 4 data points on a line chart, the line is jerky and trends are hard
to spot. Users can't distinguish between noise (random fluctuation) and signal
(actual trend).

## The Solution

Use **different date ranges** for different data frequencies:

```typescript
const { oneYearAgo, twoYearsAgo } = useDateRange();

const [gdp, industrialProd] = await Promise.all([
  getFredSeriesCached('A191RL1Q225SBEA', twoYearsAgo),  // Quarterly → 2 years → 8 points ✅
  getFredSeriesCached('INDPRO', oneYearAgo),             // Monthly → 1 year → 12 points ✅
]);
```

Now GDP has 8 quarterly points (2 years × 4 quarters), making trends visible.

---

## Walking Through the Code

### Step 1: Understanding Data Density

The core insight is that **data frequency determines required time range:**

| Series Frequency | Points per Year | Ideal Range | Reason |
|-----------------|-----------------|-------------|--------|
| Quarterly | 4 | 2 years (8 points) | 4 points too sparse, need 8+ |
| Monthly | 12 | 1 year (12 points) | 12 points show clear trends |
| Weekly | 52 | 3-6 months (13-26 points) | 52 points too crowded |
| Daily | 365 | 1-2 weeks (7-14 points) | 365 points unreadable |

**Rule of thumb:** Aim for 8-15 data points on a chart for optimal readability.

### Step 2: Multiple Date Range Imports

```typescript
const { oneYearAgo, twoYearsAgo } = useDateRange();
const { formatMonthly, formatQuarterly } = useDataFormatter();
```

**Why import both date ranges?**

The hook needs to accommodate both data frequencies. `useDateRange` provides
pre-calculated date strings:

```typescript
// Inside useDateRange.ts
return useMemo(() => {
  const today = new Date();

  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const twoYearsAgo = new Date(today);
  twoYearsAgo.setFullYear(today.getFullYear() - 2);

  return {
    oneYearAgo:  oneYearAgo.toISOString().split('T')[0],   // "2024-02-09"
    twoYearsAgo: twoYearsAgo.toISOString().split('T')[0],  // "2023-02-09"
  };
}, []);
```

The `useMemo` with empty deps `[]` ensures these date strings are computed **once**
and never change across renders (preventing infinite loops in `useEffect`).

**Why import both formatters?**

Quarterly and monthly data need different label formats:

- **formatMonthly:** `"Jan"`, `"Feb"`, `"Mar"` — short month only (year not shown)
- **formatQuarterly:** `"Jan '24"`, `"Apr '24"` — includes year for context

When viewing 2 years of quarterly data, year labels are essential to distinguish
"Jan '24" (Q1 2024) from "Jan '25" (Q1 2025).

### Step 3: Mixed Fetching

```typescript
const [realGdp, nominalGdp, industrialProd, retailSales, capacityUtil] =
  await Promise.all([
    getFredSeriesCached('A191RL1Q225SBEA', twoYearsAgo),  // ← 2 years (quarterly)
    getFredSeriesCached('A191RP1Q027SBEA', twoYearsAgo),  // ← 2 years (quarterly)
    getFredSeriesCached('INDPRO', oneYearAgo),            // ← 1 year  (monthly)
    getFredSeriesCached('RSAFS', oneYearAgo),             // ← 1 year  (monthly)
    getFredSeriesCached('TCU', oneYearAgo),               // ← 1 year  (monthly)
  ]);
```

**How do you know which series need which date range?**

Check the FRED series page for frequency:
1. Go to `https://fred.stlouisfed.org/series/A191RL1Q225SBEA`
2. Look for "Frequency: Quarterly"
3. Series with "Quarterly" → use `twoYearsAgo`
4. Series with "Monthly" → use `oneYearAgo`

**What if you use the wrong date range?**

```typescript
// ❌ Using 1 year for quarterly data
getFredSeriesCached('A191RL1Q225SBEA', oneYearAgo)
// Returns: 4 points — trends invisible

// ✅ Using 2 years for quarterly data
getFredSeriesCached('A191RL1Q225SBEA', twoYearsAgo)
// Returns: 8 points — trends visible
```

### Step 4: Mixed Formatting

```typescript
setData({
  realGdp:       formatQuarterly(realGdp),        // ← formatQuarterly
  nominalGdp:    formatQuarterly(nominalGdp),     // ← formatQuarterly
  industrialProd: formatMonthly(industrialProd),  // ← formatMonthly
  retailSales:   formatMonthly(retailSales),      // ← formatMonthly
  capacityUtil:  formatMonthly(capacityUtil),     // ← formatMonthly
});
```

**Why does quarterly data need year labels?**

When showing 2 years of data, "Jan" is ambiguous:

```typescript
// ❌ formatMonthly on quarterly data
formatMonthly(realGdp)
// Returns: [{ date: "Jan", value: 2.5 }, { date: "Apr", value: 3.1 }, ...]
// WRONG! Jan, Apr, Jul, Oct appear twice (once per year) with no year distinction

// ✅ formatQuarterly on quarterly data
formatQuarterly(realGdp)
// Returns: [{ date: "Jan '23", value: 2.5 }, { date: "Apr '23", value: 3.1 }, ...]
// CORRECT! Year is clear
```

**How does formatQuarterly work?**

```typescript
const formatQuarterly = useCallback((data: FredSeriesData[]): ChartData[] =>
  data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    value: parseFloat(d.value),
  })), []);
```

FRED quarterly dates map to quarters: Jan 1 = Q1, Apr 1 = Q2, Jul 1 = Q3, Oct 1 = Q4.
So `formatQuarterly` returns `"Jan '24"`, `"Apr '24"`, etc. — readable as Q1, Q2, etc.

**Alternate implementation (explicit Q1/Q2 labels):**

```typescript
const quarter = Math.floor(new Date(d.date).getMonth() / 3) + 1;
const year = new Date(d.date).getFullYear().toString().slice(-2);
return { date: `Q${quarter} '${year}`, value: parseFloat(d.value) };
```

The current implementation uses month names for simplicity.

### Step 5: useEffect Dependencies

```typescript
useEffect(() => {
  if (!isActive) return;
  loadData();
}, [isActive, oneYearAgo, twoYearsAgo, formatMonthly, formatQuarterly]);
//                         ^^^^^^^^^^^ Both date ranges required in deps
```

**Why include both date ranges in dependencies?**

Even though not all series use both, the effect should re-run if *either* changes.
In practice, these dates are memoized with empty deps so they never change. But
TypeScript's exhaustive-deps lint rule requires all used variables in deps.

---

## Comprehension Questions

**Q1:** A new series `PAYEMS` (nonfarm payrolls) is published monthly. You want to
add it to `useEconomicGrowthData`. Which date range do you use? Which formatter?

**Q2:** The Fed starts publishing a new series with **weekly** frequency. Following
the "8-15 data points" rule, how many months of data should you fetch? Calculate
the number of points.

**Q3:** You accidentally use `formatMonthly` on 2 years of quarterly GDP data. What
do the X-axis labels look like? Why is this confusing for users?

**Q4:** Why does `formatQuarterly` return `"Jan '24"` instead of `"Q1 '24"` for the
first quarter of 2024? Is this a bug?

**Q5:** If you remove `twoYearsAgo` from the `useEffect` dependency array, will the
hook break immediately? Why or why not?

---

## Common Pitfalls

### Pitfall 1: Using 1 Year for All Series

```typescript
// ❌ WRONG
const { oneYearAgo } = useDateRange();
const [gdp, industrial] = await Promise.all([
  getFredSeriesCached('A191RL1Q225SBEA', oneYearAgo),  // Only 4 points
  getFredSeriesCached('INDPRO', oneYearAgo),
]);
```

**Fix:** Use `twoYearsAgo` for quarterly series to get 8 points.

### Pitfall 2: Using formatMonthly on Quarterly Data

```typescript
// ❌ WRONG
const gdpData = formatMonthly(gdp);  // Shows "Jan", "Apr", "Jul", "Oct"
// Problem: No year context — can't tell which "Jan" is 2024 vs 2025
```

**Fix:** Use `formatQuarterly` to include year labels.

### Pitfall 3: Hardcoding Date Ranges

```typescript
// ❌ WRONG — infinite loop!
const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
const dateStr = twoYearsAgo.toISOString().split('T')[0];

useEffect(() => {
  loadData();
}, [isActive, dateStr]);  // ← dateStr is NEW every render
```

**Fix:** Use `useDateRange()` which memoizes dates.

---

## Next Steps

Now that you understand mixed date ranges:
1. Read `useKeyIndicatorsData` — another example of quarterly + monthly mix
2. Move to Tutorial 3 (`useConsumerSpendingData`) to learn multi-line charts
3. Experiment: Add a weekly series to this hook with appropriate date range

---

# Tutorial 3: Merged Series Pattern (useConsumerSpendingData)

## What You'll Learn

This tutorial walks through `useConsumerSpendingData`, which introduces the
**Merged Series Pattern** for multi-line charts. You'll learn:
- Why index-based merging is dangerous and corrupts data
- How `mergeSeriesByDate` safely aligns multiple series
- Why ISO date format (YYYY-MM-DD) is required for merged charts
- How transform functions scale values to fit on the same Y-axis
- The difference between `ChartData[]` and `MergedDataPoint[]`

---

## The Problem This Hook Solves

Consumer spending is measured across multiple categories (total PCE, durable goods,
services). Displaying these on the same chart lets users compare trends. But naively
merging series by index causes **data corruption**.

### The Dangerous Index-Based Approach

```typescript
// ❌ DANGEROUS: Index-based merge
const pceTotal = [
  { date: "Jan", value: 1000 },
  { date: "Feb", value: 1050 },
  { date: "Mar", value: 1100 },
];

const pceDurables = [
  { date: "Jan", value: 200 },
  { date: "Mar", value: 220 },  // ← Missing Feb!
];

const merged = pceTotal.map((d, i) => ({
  date: d.date,
  total:   d.value,
  durables: pceDurables[i]?.value,  // ← Index 0, 1, 2 from durables array
}));

// Result:
// [
//   { date: "Jan", total: 1000, durables: 200 },    ✅ Correct
//   { date: "Feb", total: 1050, durables: 220 },    ❌ WRONG! This is March data!
//   { date: "Mar", total: 1100, durables: undefined }, ❌ Missing actual March
// ]
```

**What went wrong?**

The `durables` array only has 2 elements (Jan and Mar). When you access
`pceDurables[1]`, you get the **second element** (March data), not February.
The chart plots March's 220 value in the February slot — **data corruption**.

**Why does this happen?**

FRED series can have missing data points due to:
- Delayed publication (Feb data not yet released)
- Revisions (older data removed)
- Different collection schedules
- Holidays (no collection on certain dates)

Arrays don't preserve date identity — only position. Position-based merging
assumes all arrays have identical date sequences, which is often false.

### The Safe Date-Based Approach

```typescript
// ✅ SAFE: Date-based merge using mergeSeriesByDate
const merged = mergeSeriesByDate([
  { key: 'total',   data: pceTotal },
  { key: 'durables', data: pceDurables },
]);

// Result:
// [
//   { date: "Jan", total: 1000, durables: 200  },  ✅
//   { date: "Feb", total: 1050, durables: null },   ✅ Null for missing data
//   { date: "Mar", total: 1100, durables: 220  },  ✅
// ]
```

`mergeSeriesByDate` uses dates as keys, not indices. Missing dates fill with `null`
(not `undefined`, not `0` — null signals "no data").

---

## Walking Through the Code

### Step 1: ISO Date Format Requirement

```typescript
const { formatIsoDate } = useDataFormatter();
```

**Why ISO format instead of `formatMonthly`?**

`mergeSeriesByDate` compares date strings for equality. Short month names collide:

```typescript
// ❌ Using formatMonthly (short month names)
const pceTotal = [
  { date: "Jan", value: 1000 },  // Which January? 2024? 2025?
  { date: "Jan", value: 1050 },  // Another January!
];
// mergeSeriesByDate can't distinguish Jan 2024 from Jan 2025 — they're both "Jan"
```

**ISO format preserves full date identity:**

```typescript
// ✅ Using formatIsoDate (YYYY-MM-DD)
const pceTotal = [
  { date: "2024-01-01", value: 1000 },
  { date: "2025-01-01", value: 1100 },  // Clearly different from 2024-01-01
];
```

ISO dates are also lexicographically sortable — `"2024-01-01" < "2024-02-01"`
works correctly with string comparison.

**What does formatIsoDate do?**

```typescript
const formatIsoDate = useCallback((data: FredSeriesData[]): ChartData[] =>
  data.map(d => ({
    date: d.date,  // ← Keep ISO date as-is
    value: parseFloat(d.value),
  })), []);
```

FRED already returns dates in ISO format. `formatIsoDate` simply preserves them
(unlike `formatMonthly` which converts to `"Jan"`).

### Step 2: How mergeSeriesByDate Works Internally

```typescript
export function mergeSeriesByDate(seriesConfigs: SeriesConfig[]): MergedDataPoint[] {
  // Step 1: Collect all unique dates across all series
  const dateSet = new Set<string>();
  seriesConfigs.forEach(config => {
    config.data.forEach(point => dateSet.add(point.date));
  });
  // dateSet = Set(["2024-01-01", "2024-02-01", "2024-03-01"])

  // Step 2: Sort dates chronologically
  const sortedDates = Array.from(dateSet).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  );

  // Step 3: Build a lookup map for each series: date → value
  const seriesMaps = seriesConfigs.map(config => {
    const map = new Map<string, number>();
    config.data.forEach(point => {
      const value = config.transform ? config.transform(point.value) : point.value;
      map.set(point.date, value);
    });
    return { key: config.key, map };
  });

  // Step 4: Build merged data points
  return sortedDates.map(date => {
    const point: MergedDataPoint = { date };
    seriesMaps.forEach(({ key, map }) => {
      point[key] = map.get(date) ?? null;  // ← null for missing data
    });
    return point;
  });
}
```

**Why null instead of 0 or undefined?**

- **0** implies "measured value is zero" — misleading when data wasn't collected
- **undefined** causes TypeScript errors; chart libraries often crash
- **null** explicitly means "no data available" — chart libraries show a gap in the line

### Step 3: Transform Functions

Some series have vastly different scales and can't share a Y-axis without scaling:

```typescript
const savingsChart = mergeSeriesByDate([
  { key: 'savingRate',      data: formatIsoDate(savingRate) },
  {
    key: 'disposableIncome',
    data: formatIsoDate(dispIncome),
    transform: (v: number) => v / 1000,  // ← Divide by 1000
  },
]);
```

**Why transform disposable income?**

| Series | Raw Value | Unit |
|--------|-----------|------|
| Saving Rate | 3.5 | percent (%) |
| Disposable Income | 18,234 | billions of dollars |

Without transform, the saving rate line (3.5) is invisible next to income (18,234).
After dividing by 1000, income becomes 18.2 (trillions) — same order of magnitude
as the saving rate percentage.

**How transform works in mergeSeriesByDate:**

```typescript
const value = config.transform ? config.transform(point.value) : point.value;
map.set(point.date, value);
```

The transform is applied before storing in the lookup map.

### Step 4: Return Type — ChartData[] vs MergedDataPoint[]

```typescript
// Single-series charts use ChartData[]
export interface ChartData {
  date: string;
  value: number;  // ← One value per date
}

// Multi-series charts use MergedDataPoint[]
export interface MergedDataPoint {
  date: string;
  [key: string]: string | number | null;  // ← Multiple values (dynamic keys)
}
```

**Usage in Recharts:**

```typescript
// Single-series:
<LineChart data={employment.data.laborForce}>
  <Line dataKey="value" />
</LineChart>

// Multi-series:
<LineChart data={spending.data.pceChart}>
  <Line dataKey="total"    name="Total PCE" />
  <Line dataKey="durables" name="Durable Goods" />
  <Line dataKey="services" name="Services" />
</LineChart>
```

The `[key: string]` index signature allows dynamic keys without pre-defining them.

### Step 5: Full Example

```typescript
const [pceTotal, pceDurable, pceServices] = await Promise.all([
  getFredSeriesCached('PCE',   oneYearAgo),
  getFredSeriesCached('PCEDG', oneYearAgo),
  getFredSeriesCached('PCESV', oneYearAgo),
]);

const pceChart = mergeSeriesByDate([
  { key: 'total',    data: formatIsoDate(pceTotal) },
  { key: 'durables', data: formatIsoDate(pceDurable) },
  { key: 'services', data: formatIsoDate(pceServices) },
]);

// Result shape:
// [
//   { date: "2024-01-01", total: 18200, durables: 2100, services: 13400 },
//   { date: "2024-02-01", total: 18350, durables: 2150, services: 13500 },
//   ...
// ]
```

---

## Comprehension Questions

**Q1:** You merge two series by index and notice the chart looks wrong. Describe
step-by-step how missing data in one series corrupts the visualization.

**Q2:** Why does `mergeSeriesByDate` require ISO date format (YYYY-MM-DD)? What
breaks if you use short month names ("Jan", "Feb")?

**Q3:** A series has values ranging from 50,000 to 60,000 (total employed). Another
has values from 2 to 5 (unemployment rate %). How would you transform the first
series to share a Y-axis with the second?

**Q4:** Why does `mergeSeriesByDate` use `null` for missing data instead of `0`?
What would a user see if it used `0` instead?

**Q5:** Explain the difference between `ChartData[]` and `MergedDataPoint[]`. When
would you use each?

---

## Common Pitfalls

### Pitfall 1: Using formatMonthly Instead of formatIsoDate

```typescript
// ❌ WRONG
const pceChart = mergeSeriesByDate([
  { key: 'total',   data: formatMonthly(pceTotal) },    // "Jan", "Feb"
  { key: 'durables', data: formatMonthly(pceDurable) },
]);
// Problem: "Jan" from 2024 collides with "Jan" from 2025
```

**Fix:** Use `formatIsoDate` to preserve full date.

### Pitfall 2: Forgetting Transform for Different Scales

```typescript
// ❌ WRONG
const savingsChart = mergeSeriesByDate([
  { key: 'savingRate',      data: formatIsoDate(savingRate) },      // ~3.5
  { key: 'disposableIncome', data: formatIsoDate(dispIncome) },     // ~18,234
]);
// Saving rate is invisible — 3.5 vs 18,234
```

**Fix:** Add `transform: (v) => v / 1000` to scale income to trillions.

### Pitfall 3: Merging by Index

```typescript
// ❌ WRONG
const merged = series1.map((d, i) => ({
  date: d.date,
  value1: d.value,
  value2: series2[i]?.value,  // ← Assumes identical date sequences
}));
```

**Fix:** Use `mergeSeriesByDate` instead.

### Pitfall 4: Using 0 for Missing Data

```typescript
// ❌ WRONG
point[key] = map.get(date) ?? 0;  // ← Implies "measured zero"
```

**Fix:** Use `null` to signal "no data available".

---

## Next Steps

Now that you understand merged series:
1. Read `useMarketIndicesData` — merges 3 equity indices over 3 years
2. Move to Tutorial 4 (`useKeyIndicatorsData`) to learn the Always-On pattern
3. Experiment: Create a merged housing chart (home prices + mortgage rates)

---

# Tutorial 4: Always-On Hook Pattern (useKeyIndicatorsData)

## What You'll Learn

This tutorial walks through `useKeyIndicatorsData`, which introduces the
**Always-On Pattern** — a hook that loads data immediately on mount without an
`isActive` parameter. You'll learn:
- When to skip the `isActive` guard (and when not to)
- Why key indicators load eagerly instead of lazily
- How to aggregate time-series data (CPI yearly aggregation)
- The trade-offs between eager and lazy loading
- Why the initial loading state differs from other hooks

---

## The Problem This Hook Solves

Most domain hooks use lazy loading: data fetches only when the user navigates to
that section. This saves bandwidth and improves initial page load.

But some data is **always visible** on the page — it's displayed immediately when
the user lands, not hidden behind a tab:

```typescript
// Interest Rates section is always rendered (not behind a tab)
<InterestRatesSection
  cpi={keyIndicators.data.cpi}
  tenYearData={keyIndicators.data.tenYear}
  fedFundsData={keyIndicators.data.fedFunds}
  mortgageData={keyIndicators.data.mortgage}
/>
```

**What happens if we use lazy loading for always-visible data?**

```typescript
// ❌ WRONG: Using isActive for always-visible data
const keyIndicators = useKeyIndicatorsData(activeSection === 'interest-rates');

// Problem:
// - User lands on page → activeSection defaults to 'inflation'
// - InterestRatesSection renders immediately → needs data
// - But isActive is false → no data fetched
// - Section shows empty/broken state even though it's visible
// - User must click "Interest Rates" tab to trigger fetch — counterintuitive
```

**The solution: Always-On Pattern**

Remove the `isActive` parameter entirely. Data loads on component mount, regardless
of which section is active.

---

## Walking Through the Code

### Step 1: No isActive Parameter

```typescript
// Other hooks:
export function useEmploymentData(isActive: boolean): DomainHookResult<EmploymentData>

// This hook:
export function useKeyIndicatorsData(): DomainHookResult<KeyIndicatorsData>
//                                     ↑ No parameters
```

The caller doesn't pass activation state:

```typescript
// Other hooks:
const employment = useEmploymentData(activeSection === 'employment');

// This hook:
const keyIndicators = useKeyIndicatorsData();  // Always active
```

Removing the parameter makes the intent unmistakable: this data always loads.

### Step 2: No isActive Guard in useEffect

```typescript
useEffect(() => {
  // ❌ Other hooks have this guard:
  // if (!isActive) return;

  // ✅ This hook skips the guard entirely:
  async function loadData() {
    setLoading(true);
    // ... fetch data ...
  }

  loadData();
}, [oneYearAgo, threeYearsAgo, formatMonthly, formatQuarterly]);
// Note: isActive is NOT in the deps (it doesn't exist)
```

Without the guard, `loadData()` runs immediately on mount.

**The effect runs:**
1. Once on component mount
2. If date ranges or formatters change (in practice never — they're memoized)

So effectively it runs **once** and never re-runs.

### Step 3: Initial Loading State Differs

```typescript
// Other hooks (lazy):
const [loading, setLoading] = useState(false);  // ← false initially — "idle"

// This hook (always-on):
const [loading, setLoading] = useState(true);   // ← true initially — "loading"
```

**Why start with `loading: true`?**

- **Lazy hooks** start idle — no data is being fetched. Loading only starts when
  `isActive` becomes true. Starting at `false` is correct.

- **Always-on hooks** start fetching immediately on mount. If you start at `false`,
  there's a 1-frame window where `loading` is `false` but the component renders
  with empty data. This causes a brief flash of empty/broken UI before the spinner
  appears.

  Starting at `true` eliminates this flash — the spinner shows from the first frame.

### Step 4: When to Use the Always-On Pattern

**Use always-on when:**
- ✅ Data is displayed on initial page load (above the fold)
- ✅ Dataset is small (fast to fetch, little bandwidth)
- ✅ Data is critical to the page (user can't ignore it)
- ✅ Data is accessed frequently (caching pays off quickly)

**Use lazy loading when:**
- ✅ Data is hidden behind tabs or modals
- ✅ Dataset is large (>100 KB) or slow to fetch
- ✅ Data is optional (page works without it)
- ✅ User may never navigate to that section

**Key indicators qualify for always-on because:**
- Displayed in the always-visible "Interest Rates" section at page top
- Small dataset (8 series × ~12 data points each = ~100 points total)
- Users expect to see rates immediately on landing

### Step 5: CPI Yearly Aggregation

`useKeyIndicatorsData` includes a special aggregation pattern: reducing 36 monthly
CPI data points down to 3 yearly values.

```typescript
// Fetch 3 years of monthly CPI data
const [cpi, ...] = await Promise.all([
  getFredSeriesCached('CPIAUCSL', threeYearsAgo),  // 36 monthly points
  // ... other series ...
]);

// Aggregate: keep only January value for each year
const cpiByYear = new Map<string, number>();
cpi.forEach((d) => {
  const date  = new Date(d.date);
  const year  = date.getFullYear().toString();  // "2023", "2024", "2025"
  const month = date.getMonth();                // 0=Jan, 1=Feb, ...

  if (month === 0 && !cpiByYear.has(year)) {    // ← Only January
    cpiByYear.set(year, parseFloat(d.value));
  }
});

const cpiData = Array.from(cpiByYear.entries())
  .map(([year, value]) => ({ date: year, value }))
  .sort((a, b) => parseInt(a.date) - parseInt(b.date));
// Result: [{ date: "2023", value: 298.4 }, { date: "2024", value: 310.3 }, { date: "2025", value: 320.8 }]
```

**Why aggregate to yearly?**

A high-level dashboard needs summary views. Showing 36 monthly CPI bars is too
granular. Three yearly bars give users immediate context (2023 vs 2024 vs 2025)
without noise.

**Why January values?**

Using a consistent month across all years ensures apples-to-apples comparison and
aligns with how organizations typically report annual figures (as of Jan 1).

**Why `month === 0`?**

JavaScript's `Date.getMonth()` is 0-indexed: January = 0, December = 11.

**Why `!cpiByYear.has(year)` check?**

Guards against duplicate data (e.g., FRED revisions publishing two January entries
for the same year). The first entry wins.

---

## Comprehension Questions

**Q1:** You want to add a new hook for displaying the latest S&P 500 data in the
page footer (always visible). Should you use always-on or lazy loading? Why?

**Q2:** What happens if you initialize `loading: false` in an always-on hook?
Describe the 1-frame flash and why it degrades UX.

**Q3:** The CPI aggregation uses January values. Modify the condition to use
December values instead. Which line changes?

**Q4:** Why is `isActive` absent from the `useEffect` dependency array? What
TypeScript error would appear if you added it?

**Q5:** A developer argues `useEmploymentData` should be always-on to preload data.
List 3 reasons why this would be a mistake.

---

## Common Pitfalls

### Pitfall 1: Using Always-On for Tab-Gated Data

```typescript
// ❌ WRONG: Employment is hidden behind a tab
export function useEmploymentData(): DomainHookResult<EmploymentData> {
  useEffect(() => {
    loadData();  // ← Fires even when user is on the Inflation tab
  }, []);
}
```

**Problem:** Wastes bandwidth; user may never visit that tab.

**Fix:** Keep `isActive` parameter for tab-gated data.

### Pitfall 2: Starting loading at false in Always-On Hooks

```typescript
// ❌ WRONG — causes 1-frame flash
const [loading, setLoading] = useState(false);

useEffect(() => {
  async function loadData() {
    setLoading(true);  // ← 1-frame after mount
    // ...
  }
  loadData();
}, []);
```

**Fix:** Initialize `loading: true` for always-on hooks.

### Pitfall 3: Leaving isActive in Deps

```typescript
// ❌ WRONG
export function useKeyIndicatorsData() {
  useEffect(() => {
    loadData();
  }, [isActive]);  // ← TypeScript error: 'isActive' is not defined
}
```

**Fix:** Remove `isActive` from both parameter list and deps.

### Pitfall 4: Wrong Month Index for Aggregation

```typescript
// ❌ WRONG: month 1 = February, not January
if (month === 1 && !cpiByYear.has(year)) { ... }
```

**Fix:** Use `month === 0` for January.

### Pitfall 5: Aggregating Data That Needs Monthly Granularity

```typescript
// ❌ WRONG: Unemployment trends need monthly data
const unemploymentByYear = new Map<string, number>();
unemployment.forEach((d) => {
  const month = new Date(d.date).getMonth();
  if (month === 0) unemploymentByYear.set(year, parseFloat(d.value));
});
// 11 of 12 months discarded — monthly trend is invisible
```

**Fix:** Only aggregate when yearly view is genuinely more meaningful than monthly
(e.g., multi-year CPI baseline comparison).

---

## Next Steps

Now that you understand all 4 hook patterns:
1. Review [`HOOKS.md`](./HOOKS.md) for the architecture overview and pattern reference
2. Implement your own hook: try `useCommodityPricesData` (oil, gold, copper) using
   the Simple pattern
3. Experiment: Convert `useEmploymentData` to always-on; use Chrome DevTools Network
   tab to measure the bandwidth difference

---

## Summary: When to Use Each Pattern

| Pattern | Use When | Example Hooks |
|---------|----------|---------------|
| **Simple** | Single date range, monthly format, tab-gated | useEmploymentData, useHousingData |
| **Mixed Date Range** | Quarterly + monthly data in same hook | useEconomicGrowthData |
| **Merged Series** | Multi-line charts, different Y-axis scales | useConsumerSpendingData, useMarketIndicesData |
| **Always-On** | Data always visible, small dataset | useKeyIndicatorsData |

Most hooks (7 of 8) use the Simple pattern. Mixed Date Range and Merged Series are
special cases. Always-On is rare (1 of 8) — use sparingly.
