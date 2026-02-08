# Custom Hooks Architecture Guide

## Table of Contents
1. [Overview](#overview)
2. [Hook Patterns](#hook-patterns)
3. [FRED Series Registry](#fred-series-registry)
4. [Usage Guide](#usage-guide)
5. [Testing Patterns](#testing-patterns)
6. [Performance Considerations](#performance-considerations)
7. [Adding New Hooks](#adding-new-hooks)
8. [Common Pitfalls](#common-pitfalls)

---

## Overview

This directory contains 8 domain-specific custom hooks that manage data fetching and state for different economic indicator sections. Each hook follows a consistent pattern while handling domain-specific requirements.

### Architecture Benefits

- **Reusability:** Hooks can be used in any component (page, dashboard, mobile view)
- **Testability:** Each hook is unit tested in isolation with >90% coverage
- **Maintainability:** Domain logic is encapsulated, not scattered across components
- **Type Safety:** TypeScript ensures correct data shapes throughout
- **Performance:** Conditional loading, parallel fetching, and caching optimize data retrieval

### Directory Structure

```
app/hooks/
├── domain/              # 8 domain-specific hooks
│   ├── useInflationData.ts
│   ├── useEmploymentData.ts
│   ├── useEconomicGrowthData.ts
│   ├── useHousingData.ts
│   ├── useExchangeRatesData.ts
│   ├── useConsumerSpendingData.ts
│   ├── useMarketIndicesData.ts
│   └── useKeyIndicatorsData.ts
├── shared/              # Shared utilities
│   ├── types.ts         # TypeScript interfaces
│   ├── useDateRange.ts  # Memoized date calculations
│   └── useDataFormatter.ts  # Memoized data formatters
├── __tests__/           # Unit tests for all hooks
└── index.ts             # Barrel export
```

### Impact Metrics

**Before custom hooks:**
- 48 useState declarations scattered across page.tsx
- 8 nearly-identical useEffect blocks (~400 lines of duplicated logic)
- No way to reuse data fetching logic
- Difficult to test in isolation

**After custom hooks:**
- 8 hook calls (1 line each) in page.tsx
- All logic encapsulated in 11 files (775 total lines)
- 151 tests covering all scenarios
- Fully reusable across components

---

## Hook Patterns

All hooks follow one of four patterns. Understanding these patterns helps you choose the right approach for new data domains.

### Pattern 1: Simple Hook (Monthly Data, Single Date Range)

**Used by:** `useInflationData`, `useEmploymentData`, `useHousingData`, `useExchangeRatesData`

**Characteristics:**
- All series use the same date range (e.g., `oneYearAgo`)
- All series use the same formatting (e.g., `formatMonthly`)
- Standard `isActive` parameter for conditional loading
- Single `Promise.all` fetches all series in parallel

**Template:**
```typescript
export function useSimpleDomainData(isActive: boolean): DomainHookResult<DataType> {
  const [data, setData] = useState<DataType>({ /* initial empty state */ });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { oneYearAgo } = useDateRange();
  const { formatMonthly } = useDataFormatter();

  useEffect(() => {
    if (!isActive) return;  // Early exit when inactive

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [series1, series2, series3] = await Promise.all([
          getFredSeriesCached('CODE1', oneYearAgo),
          getFredSeriesCached('CODE2', oneYearAgo),
          getFredSeriesCached('CODE3', oneYearAgo),
        ]);

        setData({
          field1: formatMonthly(series1),
          field2: formatMonthly(series2),
          field3: formatMonthly(series3),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load data'));
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isActive, oneYearAgo, formatMonthly]);

  return { data, loading, error };
}
```

**When to use:** Your data consists of multiple series that all have the same frequency (monthly), same date range, and don't need to be merged together.

**Examples:**
- Inflation: 7 CPI variants, all monthly, 1 year
- Employment: 4 labor market metrics, all monthly, 1 year
- Housing: 7 housing metrics, all monthly, 1 year
- Exchange Rates: 9 currency pairs, all monthly, 1 year

---

### Pattern 2: Mixed Date Range Hook

**Used by:** `useEconomicGrowthData`

**Characteristics:**
- Different series use different date ranges
- Typically mixes quarterly and monthly data
- Quarterly data needs more history (fewer data points per year)

**Key Difference:**
```typescript
const { oneYearAgo, twoYearsAgo } = useDateRange();

const [realGdp, industrialProd, retailSales] = await Promise.all([
  getFredSeriesCached('GDP', twoYearsAgo),      // Quarterly: 4 points/year → need 2 years (8 points)
  getFredSeriesCached('INDPRO', oneYearAgo),    // Monthly: 12 points/year → 1 year sufficient
  getFredSeriesCached('RSAFS', oneYearAgo),     // Monthly
]);

setData({
  realGdp: formatQuarterly(realGdp),            // Quarterly formatter
  industrialProd: formatMonthly(industrialProd), // Monthly formatter
  retailSales: formatMonthly(retailSales),       // Monthly formatter
});
```

**Why different date ranges?**
- Quarterly series: Only 4 data points per year. Need 2 years (8 points) to show meaningful trends.
- Monthly series: 12 data points per year. 1 year (12 points) provides sufficient granularity.

**When to use:** You're mixing quarterly and monthly series, or you need different historical depths for different metrics.

**Example:**
- Economic Growth: GDP (quarterly, 2 years) + Industrial Production (monthly, 1 year)

---

### Pattern 3: Merged Series Hook

**Used by:** `useConsumerSpendingData`, `useMarketIndicesData`

**Characteristics:**
- Multiple series need to be displayed on the same chart
- Series may have different observation dates (different publication schedules)
- Uses `mergeSeriesByDate` helper to align data by date
- **Must use ISO date format** (YYYY-MM-DD) for merging to work correctly

**Key Difference:**
```typescript
const { formatIsoDate } = useDataFormatter();  // ISO format, not formatMonthly!

const [series1, series2, series3] = await Promise.all([...]);

// Merge multiple series into one chart dataset
const mergedChart = mergeSeriesByDate([
  { key: 'series1', data: formatIsoDate(series1) },
  { key: 'series2', data: formatIsoDate(series2) },
  { key: 'series3', data: formatIsoDate(series3) },
]);

// Optional: Apply transform functions to scale values
const savingsChart = mergeSeriesByDate([
  { key: 'savingRate', data: formatIsoDate(savingRate) },
  {
    key: 'disposableIncome',
    data: formatIsoDate(dispIncome),
    transform: (v: number) => v / 1000  // billions → trillions
  },
]);
```

**Why mergeSeriesByDate?**

Consumer spending metrics come from different sources with different publication schedules:
- PCE is published monthly
- Retail sales may have revisions at different dates
- Sentiment surveys are typically mid-month

`mergeSeriesByDate` ensures all series in a chart share the same date keys, filling gaps where needed. This prevents Recharts errors and creates clean multi-line visualizations.

**Why ISO format?**

`mergeSeriesByDate` requires ISO date strings (YYYY-MM-DD) to accurately align data points by date. Short formats like "Jan" lose year information and can cause misalignment.

**When to use:** You need to display multiple series on one chart, and the series have different publication schedules or observation dates.

**Examples:**
- Consumer Spending: 10 series → 4 merged charts (PCE by category, retail by category, savings vs income, sentiment)
- Market Indices: 7 series → 3 merged charts (equity indices, credit spreads, market breadth) + VIX standalone

---

### Pattern 4: Always-On Hook (No isActive)

**Used by:** `useKeyIndicatorsData`

**Characteristics:**
- Loads immediately on component mount
- No `isActive` parameter
- Used for data that's always visible (not behind a tab)
- `useEffect` has no conditional early return

**Key Difference:**
```typescript
export function useKeyIndicatorsData(): DomainHookResult<KeyIndicatorsData> {
  // No isActive parameter in function signature

  useEffect(() => {
    loadData();  // No "if (!isActive) return;" guard
  }, [oneYearAgo, formatMonthly]);  // No isActive in dependency array

  return { data, loading, error };
}
```

**Why no isActive?**

Key indicators load **immediately on page mount** regardless of which section the user is viewing because:
1. They appear in the always-visible "Interest Rates" section at the top of the page
2. Preloading improves perceived performance — data is ready when the user first sees the page
3. These are the most frequently accessed metrics (CPI, unemployment, interest rates)

**When to use:** Data is needed immediately on page load (e.g., always-visible header section, critical metrics that should preload).

**Example:**
- Key Indicators: 8 critical metrics (CPI, unemployment, interest rates, GDP, S&P 500) loaded on mount

---

## FRED Series Registry

All hooks fetch data from the Federal Reserve Economic Data (FRED) API. This is a comprehensive list of all 60+ series used, organized by domain.

### Inflation (7 series)

| Code | Full Name | Units | Frequency |
|------|-----------|-------|-----------|
| CPILFESL | Consumer Price Index for All Urban Consumers: All Items Less Food and Energy | Index 1982-1984=100 | Monthly |
| PCEPI | Personal Consumption Expenditures: Chain-type Price Index | Index 2017=100 | Monthly |
| PCEPILFE | Personal Consumption Expenditures Excluding Food and Energy | Index 2017=100 | Monthly |
| CPIUFDSL | Consumer Price Index for All Urban Consumers: Food | Index 1982-1984=100 | Monthly |
| CPIENGSL | Consumer Price Index for All Urban Consumers: Energy | Index 1982-1984=100 | Monthly |
| CUSR0000SAH | Consumer Price Index for All Urban Consumers: Shelter | Index 1982-1984=100 | Monthly |
| CPIMEDSL | Consumer Price Index for All Urban Consumers: Medical Care | Index 1982-1984=100 | Monthly |

### Employment (4 series)

| Code | Full Name | Units | Frequency |
|------|-----------|-------|-----------|
| CIVPART | Civilian Labor Force Participation Rate | Percent | Monthly |
| PAYEMS | All Employees, Total Nonfarm | Thousands of Persons | Monthly |
| ICSA | Initial Claims | Thousands | Weekly |
| AHETPI | Average Hourly Earnings of Production and Nonsupervisory Employees, Total Private | Dollars per Hour | Monthly |

### Economic Growth (5 series)

| Code | Full Name | Units | Frequency |
|------|-----------|-------|-----------|
| A191RL1Q225SBEA | Real Gross Domestic Product | Percent Change from Previous Period | Quarterly |
| A191RP1Q027SBEA | Real Gross Domestic Product | Billions of Chained 2017 Dollars | Quarterly |
| INDPRO | Industrial Production: Total Index | Index 2017=100 | Monthly |
| RSAFS | Advance Retail Sales: Retail and Food Services, Total | Millions of Dollars | Monthly |
| TCU | Capacity Utilization: Total Industry | Percent of Capacity | Monthly |

### Housing (7 series)

| Code | Full Name | Units | Frequency |
|------|-----------|-------|-----------|
| CSUSHPISA | S&P/Case-Shiller U.S. National Home Price Index | Index Jan 2000=100 (SA) | Monthly |
| HOUST | Housing Starts: Total: New Privately Owned Housing Units Started | Thousands of Units | Monthly |
| PERMIT | New Private Housing Units Authorized by Building Permits | Thousands of Units | Monthly |
| MORTGAGE30US | 30-Year Fixed Rate Mortgage Average in the United States | Percent | Weekly |
| FIXHAI | Housing Affordability Index | Index (higher = less affordable) | Monthly |
| HSN1F | New One Family Houses Sold: United States | Thousands | Monthly |
| EXHOSLUSM495S | Existing Home Sales | Thousands of Units | Monthly |

### Exchange Rates (9 series)

| Code | Full Name | Units | Frequency |
|------|-----------|-------|-----------|
| DTWEXBGS | Trade Weighted U.S. Dollar Index: Broad, Goods and Services | Index Jan 2006=100 | Monthly |
| DEXUSEU | U.S. / Euro Foreign Exchange Rate | Euro per U.S. Dollar | Daily |
| DEXUSUK | U.S. / U.K. Foreign Exchange Rate | British Pounds per U.S. Dollar | Daily |
| DEXJPUS | Japan / U.S. Foreign Exchange Rate | Japanese Yen per U.S. Dollar | Daily |
| DEXCHUS | China / U.S. Foreign Exchange Rate | Yuan per U.S. Dollar | Daily |
| DEXMXUS | Mexico / U.S. Foreign Exchange Rate | Pesos per U.S. Dollar | Daily |
| DEXINUS | India / U.S. Foreign Exchange Rate | Rupees per U.S. Dollar | Daily |
| DEXCAUS | Canada / U.S. Foreign Exchange Rate | Canadian Dollars per U.S. Dollar | Daily |
| DEXUSAL | Australia / U.S. Foreign Exchange Rate | Australian Dollars per U.S. Dollar | Daily |

**Note:** DTWEXBGS (Dollar Index) is the baseline index measuring the dollar's strength against a basket of major currencies.

### Consumer Spending (10 series → 4 merged charts)

| Code | Full Name | Units | Chart |
|------|-----------|-------|-------|
| PCE | Personal Consumption Expenditures | Billions of Dollars | PCE by Category |
| PCEDG | Personal Consumption Expenditures: Durable Goods | Billions of Dollars | PCE by Category |
| PCESV | Personal Consumption Expenditures: Services | Billions of Dollars | PCE by Category |
| RSAFS | Advance Retail Sales: Retail and Food Services, Total | Millions of Dollars | Retail by Category |
| RSFSDP | Advance Retail Sales: Food Services and Drinking Places | Millions of Dollars | Retail by Category |
| GAFO | Advance Retail Sales: General Merchandise Stores | Millions of Dollars | Retail by Category |
| PSAVERT | Personal Saving Rate | Percent | Savings vs Income |
| DSPI | Disposable Personal Income | Billions of Dollars (÷1000 for display) | Savings vs Income |
| UMCSENT | University of Michigan: Consumer Sentiment | Index 1966:Q1=100 | Sentiment |
| CSCICP03USM665S | Consumer Opinion Surveys: Confidence Indicators | Amplitude Adjusted Index | Sentiment |

### Market Indices (7 series → 3 merged charts + 1 standalone)

| Code | Full Name | Units | Chart |
|------|-----------|-------|-------|
| SP500 | S&P 500 | Index | Equity Indices |
| NASDAQCOM | NASDAQ Composite Index | Index | Equity Indices |
| DJIA | Dow Jones Industrial Average | Index | Equity Indices |
| VIXCLS | CBOE Volatility Index: VIX | Index | Volatility (standalone) |
| BAA10Y | Moody's Seasoned Baa Corporate Bond Yield Relative to 10-Year Treasury | Percent | Credit Spreads |
| AAA10Y | Moody's Seasoned Aaa Corporate Bond Yield Relative to 10-Year Treasury | Percent | Credit Spreads |
| NYA | NYSE Composite Index | Index | Market Breadth |

### Key Indicators (8 series)

| Code | Full Name | Units | Date Range |
|------|-----------|-------|------------|
| CPIAUCSL | Consumer Price Index for All Urban Consumers: All Items | Index 1982-1984=100 | 3 years |
| UNRATE | Unemployment Rate | Percent | 1 year |
| GS10 | Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity | Percent | 1 year |
| TB3MS | 3-Month Treasury Bill Secondary Market Rate | Percent | 1 year |
| FEDFUNDS | Federal Funds Effective Rate | Percent | 1 year |
| MORTGAGE30US | 30-Year Fixed Rate Mortgage Average | Percent | 1 year |
| A191RL1Q225SBEA | Real Gross Domestic Product | Percent Change | 1 year |
| SP500 | S&P 500 | Index | 1 year |

**Note:** CPI uses 3 years of data but is aggregated to show only January values for each year.

---

## Usage Guide

### Basic Usage in a Component

```typescript
import { useInflationData } from '@/app/hooks';

export default function InflationDashboard() {
  const [activeSection, setActiveSection] = useState('inflation');

  // Hook loads data only when this section is active
  const inflation = useInflationData(activeSection === 'inflation');

  // Always check loading state first
  if (inflation.loading) {
    return <LoadingSpinner />;
  }

  // Then check error state
  if (inflation.error) {
    return <ErrorMessage error={inflation.error} />;
  }

  // Finally render data
  return (
    <div>
      <h2>Core CPI</h2>
      <LineChart data={inflation.data.coreCpi} />

      <h2>PCE</h2>
      <LineChart data={inflation.data.pce} />

      <h2>Core PCE</h2>
      <LineChart data={inflation.data.corePce} />
    </div>
  );
}
```

### Using Multiple Hooks in One Component

```typescript
export default function EconomicDashboard() {
  const [activeTab, setActiveTab] = useState<'inflation' | 'employment'>('inflation');

  const inflation = useInflationData(activeTab === 'inflation');
  const employment = useEmploymentData(activeTab === 'employment');

  // Only one hook loads at a time due to isActive guards
  return (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <Tab value="inflation">
        {inflation.loading && <Spinner />}
        {inflation.error && <ErrorMessage error={inflation.error} />}
        {inflation.data && <InflationCharts data={inflation.data} />}
      </Tab>
      <Tab value="employment">
        {employment.loading && <Spinner />}
        {employment.error && <ErrorMessage error={employment.error} />}
        {employment.data && <EmploymentCharts data={employment.data} />}
      </Tab>
    </Tabs>
  );
}
```

### Always-Loaded Data (No Tabs)

```typescript
export default function KeyMetricsHeader() {
  // No isActive parameter - loads immediately on mount
  const keyIndicators = useKeyIndicatorsData();

  return (
    <header>
      <Metric
        label="CPI"
        value={keyIndicators.data.cpi}
        loading={keyIndicators.loading}
        error={keyIndicators.error}
      />
      <Metric
        label="Unemployment"
        value={keyIndicators.data.unemployment}
        loading={keyIndicators.loading}
        error={keyIndicators.error}
      />
      <Metric
        label="10-Year Treasury"
        value={keyIndicators.data.tenYear}
        loading={keyIndicators.loading}
        error={keyIndicators.error}
      />
    </header>
  );
}
```

### Working with Merged Series

```typescript
const spending = useConsumerSpendingData(activeSection === 'consumer-spending');

// Each merged chart has multiple data keys
return (
  <LineChart data={spending.data.pceChart}>
    <Line dataKey="total" name="Total PCE" stroke="#8884d8" />
    <Line dataKey="durables" name="Durable Goods" stroke="#82ca9d" />
    <Line dataKey="services" name="Services" stroke="#ffc658" />
  </LineChart>
);
```

---

## Testing Patterns

All hooks are tested using `@testing-library/react` with the `renderHook` helper.

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInflationData } from '../domain/useInflationData';
import * as fredApi from '@/app/lib/fredApi';

vi.mock('@/app/lib/fredApi');

describe('useInflationData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not load data when inactive', () => {
    const { result } = renderHook(() => useInflationData(false));

    expect(result.current.loading).toBe(false);
    expect(result.current.data.coreCpi).toEqual([]);
    expect(fredApi.getFredSeriesCached).not.toHaveBeenCalled();
  });

  it('should load data when active', async () => {
    const mockData = [
      { date: '2024-01-01', value: '310.326' },
      { date: '2024-02-01', value: '311.054' },
    ];

    vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

    const { result } = renderHook(() => useInflationData(true));

    // Initial state: loading
    expect(result.current.loading).toBe(true);

    // Wait for async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify data was loaded and formatted
    expect(result.current.data.coreCpi).toHaveLength(2);
    expect(result.current.data.coreCpi[0].date).toBe('Jan');
    expect(result.current.error).toBeNull();
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('API failure');
    vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(mockError);

    const { result } = renderHook(() => useInflationData(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain('Failed to load inflation data');
  });

  it('should fetch all required series', async () => {
    const mockData = [{ date: '2024-01-01', value: '100' }];
    vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

    renderHook(() => useInflationData(true));

    await waitFor(() => {
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(7);
    });

    expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('CPILFESL', expect.any(String));
    expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('PCEPI', expect.any(String));
    expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('PCEPILFE', expect.any(String));
  });
});
```

### Key Testing Concepts

- **renderHook** - Wraps the hook in a minimal component for testing
- **waitFor** - Waits for async state updates to complete
- **vi.mock** - Mocks the FRED API to avoid real network calls
- **mockResolvedValue / mockRejectedValue** - Control mock behavior for success/error cases

### Coverage Requirements

All hooks should achieve >90% test coverage with these minimum test cases:
1. Inactive state (no API calls when isActive=false)
2. Active loading state (data loads when isActive=true)
3. Error handling (graceful error capture and reporting)
4. Series count verification (correct number of API calls)
5. Data formatting (verify output format matches expectations)

---

## Performance Considerations

### Why useMemo and useCallback?

All shared utilities use memoization to prevent infinite render loops:

```typescript
// useDateRange.ts
export function useDateRange() {
  return useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return {
      oneYearAgo: oneYearAgo.toISOString().split('T')[0],
    };
  }, []);  // Empty deps = compute once, cache forever
}
```

**Why?** Without `useMemo`, a new object is created on every render. When that object is in a `useEffect` dependency array, the effect runs every render, causing an infinite loop.

**Same for formatters:**
```typescript
const formatMonthly = useCallback((data: FredSeriesData[]): ChartData[] => {
  return data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
    value: parseFloat(d.value),
  }));
}, []);  // Empty deps = same function reference across renders
```

Without `useCallback`, `formatMonthly` would be a new function every render, triggering `useEffect` unnecessarily.

### Conditional Loading (isActive Pattern)

Only the active section fetches data:

```typescript
useEffect(() => {
  if (!isActive) return;  // Early exit if this section isn't visible
  loadData();
}, [isActive, ...]);
```

**Benefit:** If the user never clicks the "Exchange Rates" tab, that hook never makes API calls. Saves bandwidth and API quota.

### Parallel Fetching (Promise.all)

All series in a hook fetch simultaneously:

```typescript
const [series1, series2, series3] = await Promise.all([
  getFredSeriesCached('CODE1', date),
  getFredSeriesCached('CODE2', date),
  getFredSeriesCached('CODE3', date),
]);
```

**Benefit:** 7 series fetched in parallel take ~200ms (time of slowest request), not 1400ms (7 × 200ms sequential).

**Trade-off:** All-or-nothing. If one series fails, the whole section errors. Future optimization: `Promise.allSettled` for partial data display.

### Caching

All hooks use `getFredSeriesCached` which implements:
- In-memory cache with TTL
- Request coalescing (multiple simultaneous requests share one promise)

**Benefit:** Switching between tabs is instant on subsequent visits.

---

## Adding New Hooks

### Step-by-Step Guide

**1. Identify your pattern** (see Hook Patterns section)
   - Simple? Use Pattern 1
   - Mixed dates? Use Pattern 2
   - Merged series? Use Pattern 3
   - Always-on? Use Pattern 4

**2. Create the hook file**
   - Location: `app/hooks/domain/useYourDomainData.ts`
   - Copy the closest existing hook as a template

**3. Define the data type**
   - Add interface to `app/hooks/shared/types.ts`
   ```typescript
   export interface YourDomainData {
     field1: ChartData[];
     field2: ChartData[];
   }
   ```

**4. Implement the hook**
   - Follow your chosen pattern
   - Add comprehensive JSDoc (see existing hooks for examples)
   - Document all FRED series with full names

**5. Write tests**
   - Location: `app/hooks/__tests__/useYourDomainData.test.ts`
   - Minimum 5 tests: inactive, active, error, series count, formatting

**6. Export from barrel**
   - Add to `app/hooks/index.ts`

**7. Verify**
   ```bash
   npx tsc --noEmit  # TypeScript compiles
   npx vitest run    # All tests pass
   ```

**8. Integrate into page**
   ```typescript
   const yourDomain = useYourDomainData(activeSection === 'your-section');
   ```

---

## Common Pitfalls

### Pitfall 1: Forgetting useMemo/useCallback

❌ **Wrong:**
```typescript
const dates = {
  oneYearAgo: new Date().toISOString(),  // New object every render
};

useEffect(() => {
  loadData();
}, [dates.oneYearAgo]);  // Infinite loop!
```

✅ **Correct:**
```typescript
const { oneYearAgo } = useDateRange();  // Memoized, stable reference

useEffect(() => {
  loadData();
}, [oneYearAgo]);  // Only runs when value actually changes
```

### Pitfall 2: Checking data before loading/error

❌ **Wrong:**
```typescript
if (inflation.data.coreCpi.length > 0) return <Chart />;
if (inflation.loading) return <Spinner />;
```

✅ **Correct:**
```typescript
if (inflation.loading) return <Spinner />;  // Check loading first
if (inflation.error) return <Error />;       // Then error
return <Chart data={inflation.data.coreCpi} />;  // Finally data
```

**Why?** During the first render, `data` is the initial empty state. If you check data first, you'll render empty charts before the loading spinner appears.

### Pitfall 3: Mixing formatIsoDate and formatMonthly with mergeSeriesByDate

❌ **Wrong:**
```typescript
const chart = mergeSeriesByDate([
  { key: 'a', data: formatMonthly(series1) },  // "Jan", "Feb"
  { key: 'b', data: formatMonthly(series2) },  // "Jan", "Feb"
]);
// mergeSeriesByDate can't align "Jan" from 2023 vs 2024 — year is lost!
```

✅ **Correct:**
```typescript
const chart = mergeSeriesByDate([
  { key: 'a', data: formatIsoDate(series1) },  // "2024-01-01"
  { key: 'b', data: formatIsoDate(series2) },  // "2024-01-01"
]);
// ISO dates preserve year, month, day — alignment works correctly
```

### Pitfall 4: Not handling Promise.all failures

The current all-or-nothing approach means one failed series loses all data. This is intentional (partial data can be misleading), but be aware:

```typescript
await Promise.all([
  getFredSeriesCached('VALID_CODE', date),    // succeeds
  getFredSeriesCached('INVALID_CODE', date),  // fails
  getFredSeriesCached('ANOTHER_VALID', date), // succeeds
]);
// Result: entire Promise.all throws, all data lost
```

**Future improvement:** Use `Promise.allSettled` to display partial results.

### Pitfall 5: Missing type parameters on generic functions

❌ **Wrong:**
```typescript
const results = await Promise.all(promises);
results[0].someField  // TypeScript error: unknown type
```

✅ **Correct:**
```typescript
const results = await Promise.all<MyDataType>(promises);
results[0].someField  // TypeScript knows the type
```

---

## Questions?

If you're stuck:
1. Check the existing hooks for examples (start with `useInflationData` — it's the reference implementation)
2. Read the tests to understand expected behavior
3. Review the beginner tutorials in the plan file (`/root/.claude/plans/lovely-squishing-muffin.md`)

---

*Last Updated: Phase 2.5 — Documentation & Education*
*See individual hook files for detailed JSDoc comments and usage examples*
