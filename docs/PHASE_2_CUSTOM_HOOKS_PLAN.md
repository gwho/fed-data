# Phase 2: Custom Hooks for Data Domains
## Refactoring Plan with Educational Guidance

**Branch**: `claude/phase-2-velvety-snail-plan-g1CPT`
**Goal**: Refactor 48 useState hooks in page.tsx into 8 domain-specific custom hooks
**Impact**: Reduce page.tsx from 1,817 lines to ~600-800 lines (55-60% reduction)

---

## 📊 Current State Analysis

### Problem: State Management Sprawl

**File**: `/home/user/fed-data/app/page.tsx` (1,817 lines)

**Current State:**
- **48 useState hooks** managing individual data series
- **8 useEffect hooks** with nearly identical patterns
- **9 logical domains** scattered throughout the file
- Difficult to maintain, test, and reuse

**State Hook Breakdown by Domain:**
1. **Inflation** (8 hooks): coreCpiData, pceData, corePceData, foodCpiData, energyCpiData, housingCpiData, medicalCpiData, inflationLoading
2. **Employment** (5 hooks): laborForceData, payrollsData, initialClaimsData, hourlyEarningsData, employmentLoading
3. **Economic Growth** (6 hooks): realGdpData, nominalGdpData, industrialProdData, retailSalesData, capacityUtilData, economicGrowthLoading
4. **Housing** (8 hooks): homePriceData, housingStartsData, buildingPermitsData, mortgageRateData, affordabilityData, newHomeSalesData, existingHomeSalesData, housingLoading
5. **Exchange Rates** (10 hooks): dollarIndexData, eurData, gbpData, jpyData, cnyData, mxnData, inrData, cadData, audData, exchangeRatesLoading
6. **Consumer Spending** (5 hooks): pceChartData, retailChartData, savingsChartData, sentimentChartData, consumerSpendingLoading
7. **Market Indices** (5 hooks): equityIndicesData, vixData, creditSpreadData, breadthData, marketIndicesLoading
8. **Key Indicators** (9 hooks): cpiData, unemploymentData, tenYearData, threeMonthData, fedFundsData, mortgageData, gdpData, sp500Data, loading
9. **Navigation** (1 hook): activeSection

### Why This Refactoring Matters

**Performance Issues:**
- Prop drilling through multiple levels
- Unnecessary re-renders when unrelated state changes
- Difficult to optimize with React.memo

**Maintainability Issues:**
- Hard to find where specific data is managed
- Duplicated data loading logic across 8 useEffect hooks
- Cannot easily test data transformations in isolation

**Reusability Issues:**
- Cannot share data loading logic across components
- Tightly coupled to page.tsx component

---

## 🎯 Solution: Domain-Specific Custom Hooks

### Target Architecture

**Transform from:**
```typescript
// page.tsx - 48 individual hooks
const [coreCpiData, setCoreCpiData] = useState<ChartData[]>([]);
const [pceData, setPceData] = useState<ChartData[]>([]);
const [corePceData, setCorePceData] = useState<ChartData[]>([]);
// ... 45 more useState hooks ...

useEffect(() => {
  async function loadInflationData() {
    if (activeSection !== 'inflation') return;
    setInflationLoading(true);
    try {
      const [coreCpi, pce, corePce, ...] = await Promise.all([...]);
      setCoreCpiData(formatData(coreCpi));
      setPceData(formatData(pce));
      // ... more setState calls ...
    } finally {
      setInflationLoading(false);
    }
  }
  loadInflationData();
}, [activeSection]);
```

**To:**
```typescript
// page.tsx - 8 domain hooks
const inflation = useInflationData(activeSection === 'inflation');
const employment = useEmploymentData(activeSection === 'employment');
const economicGrowth = useEconomicGrowthData(activeSection === 'economic-growth');
const housing = useHousingData(activeSection === 'housing');
const exchangeRates = useExchangeRatesData(activeSection === 'exchange-rates');
const consumerSpending = useConsumerSpendingData(activeSection === 'consumer-spending');
const marketIndices = useMarketIndicesData(activeSection === 'market-indices');
const keyIndicators = useKeyIndicatorsData(); // No condition - loads on mount

// Usage in JSX:
{inflation.loading ? <LoadingSpinner /> : <Chart data={inflation.data.coreCpi} />}
```

---

## 📁 Directory Structure

```
/home/user/fed-data/app/
├── hooks/
│   ├── domain/
│   │   ├── useInflationData.ts         # 8 hooks → 1
│   │   ├── useEmploymentData.ts        # 5 hooks → 1
│   │   ├── useEconomicGrowthData.ts    # 6 hooks → 1
│   │   ├── useHousingData.ts           # 8 hooks → 1
│   │   ├── useExchangeRatesData.ts     # 10 hooks → 1
│   │   ├── useConsumerSpendingData.ts  # 5 hooks → 1 (complex: mergeSeriesByDate)
│   │   ├── useMarketIndicesData.ts     # 5 hooks → 1 (complex: mergeSeriesByDate)
│   │   └── useKeyIndicatorsData.ts     # 9 hooks → 1 (special: loads on mount)
│   ├── shared/
│   │   ├── types.ts                    # Shared TypeScript interfaces
│   │   ├── useDateRange.ts             # Date calculation utilities
│   │   └── useDataFormatter.ts         # Data formatting utilities
│   ├── __tests__/
│   │   ├── useInflationData.test.ts
│   │   ├── useEmploymentData.test.ts
│   │   ├── useEconomicGrowthData.test.ts
│   │   ├── useHousingData.test.ts
│   │   ├── useExchangeRatesData.test.ts
│   │   ├── useConsumerSpendingData.test.ts
│   │   ├── useMarketIndicesData.test.ts
│   │   └── useKeyIndicatorsData.test.ts
│   └── index.ts                        # Barrel export
└── page.tsx                            # MODIFIED: Use hooks instead of useState/useEffect
```

---

## 🔧 Implementation Details

### 1. Shared Types (`hooks/shared/types.ts`)

```typescript
export interface ChartData {
  date: string;
  value: number;
}

export interface DomainHookResult<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

export interface InflationData {
  coreCpi: ChartData[];
  pce: ChartData[];
  corePce: ChartData[];
  foodCpi: ChartData[];
  energyCpi: ChartData[];
  housingCpi: ChartData[];
  medicalCpi: ChartData[];
}

export interface EmploymentData {
  laborForce: ChartData[];
  payrolls: ChartData[];
  initialClaims: ChartData[];
  hourlyEarnings: ChartData[];
}

// ... similar interfaces for other domains
```

### 2. Date Range Hook (`hooks/shared/useDateRange.ts`)

```typescript
import { useMemo } from 'react';

export function useDateRange() {
  return useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    return {
      oneYearAgo: oneYearAgo.toISOString().split('T')[0],
      twoYearsAgo: twoYearsAgo.toISOString().split('T')[0],
      threeYearsAgo: threeYearsAgo.toISOString().split('T')[0],
    };
  }, []);
}
```

### 3. Data Formatter Hook (`hooks/shared/useDataFormatter.ts`)

```typescript
import { useCallback } from 'react';
import { ChartData } from './types';
import { FredSeriesData } from '@/app/lib/fredApi';

export function useDataFormatter() {
  // Format with short month name (e.g., "Jan")
  const formatMonthly = useCallback((data: FredSeriesData[]): ChartData[] =>
    data.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
      value: parseFloat(d.value),
    })), []);

  // Format with month and year (e.g., "Jan '24")
  const formatQuarterly = useCallback((data: FredSeriesData[]): ChartData[] =>
    data.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      value: parseFloat(d.value),
    })), []);

  // Keep ISO date format (for mergeSeriesByDate)
  const formatIsoDate = useCallback((data: FredSeriesData[]): ChartData[] =>
    data.map(d => ({
      date: d.date,
      value: parseFloat(d.value),
    })), []);

  return { formatMonthly, formatQuarterly, formatIsoDate };
}
```

### 4. Example Domain Hook: Inflation (`hooks/domain/useInflationData.ts`)

```typescript
import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, InflationData } from '../shared/types';

export function useInflationData(isActive: boolean): DomainHookResult<InflationData> {
  const [data, setData] = useState<InflationData>({
    coreCpi: [],
    pce: [],
    corePce: [],
    foodCpi: [],
    energyCpi: [],
    housingCpi: [],
    medicalCpi: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { oneYearAgo } = useDateRange();
  const { formatMonthly } = useDataFormatter();

  useEffect(() => {
    if (!isActive) return;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [coreCpi, pce, corePce, foodCpi, energyCpi, housingCpi, medicalCpi] =
          await Promise.all([
            getFredSeriesCached('CPILFESL', oneYearAgo),
            getFredSeriesCached('PCEPI', oneYearAgo),
            getFredSeriesCached('PCEPILFE', oneYearAgo),
            getFredSeriesCached('CPIUFDSL', oneYearAgo),
            getFredSeriesCached('CPIENGSL', oneYearAgo),
            getFredSeriesCached('CUSR0000SAH', oneYearAgo),
            getFredSeriesCached('CPIMEDSL', oneYearAgo),
          ]);

        setData({
          coreCpi: formatMonthly(coreCpi),
          pce: formatMonthly(pce),
          corePce: formatMonthly(corePce),
          foodCpi: formatMonthly(foodCpi),
          energyCpi: formatMonthly(energyCpi),
          housingCpi: formatMonthly(housingCpi),
          medicalCpi: formatMonthly(medicalCpi),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load inflation data'));
        console.error('Error loading inflation data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isActive, oneYearAgo, formatMonthly]);

  return { data, loading, error };
}
```

### 5. Complex Hook: Consumer Spending (uses mergeSeriesByDate)

```typescript
import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { mergeSeriesByDate } from '@/app/utils/chartHelpers';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, ConsumerSpendingData, MergedDataPoint } from '../shared/types';

export function useConsumerSpendingData(isActive: boolean): DomainHookResult<ConsumerSpendingData> {
  const [data, setData] = useState<ConsumerSpendingData>({
    pceChart: [],
    retailChart: [],
    savingsChart: [],
    sentimentChart: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { oneYearAgo } = useDateRange();
  const { formatIsoDate } = useDataFormatter();

  useEffect(() => {
    if (!isActive) return;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [pceTotal, pceDurable, pceServices, totalRetail, foodServices, generalMerch,
               savingRate, dispIncome, sentiment, confidence] = await Promise.all([
          getFredSeriesCached('PCE', oneYearAgo),
          getFredSeriesCached('PCEDG', oneYearAgo),
          getFredSeriesCached('PCESV', oneYearAgo),
          getFredSeriesCached('RSAFS', oneYearAgo),
          getFredSeriesCached('RSFSDP', oneYearAgo),
          getFredSeriesCached('GAFO', oneYearAgo),
          getFredSeriesCached('PSAVERT', oneYearAgo),
          getFredSeriesCached('DSPI', oneYearAgo),
          getFredSeriesCached('UMCSENT', oneYearAgo),
          getFredSeriesCached('CSCICP03USM665S', oneYearAgo),
        ]);

        // Chart 1: PCE by Category (merged)
        const pceChart = mergeSeriesByDate([
          { key: 'total', data: formatIsoDate(pceTotal) },
          { key: 'durables', data: formatIsoDate(pceDurable) },
          { key: 'services', data: formatIsoDate(pceServices) },
        ]);

        // Chart 2: Retail Sales by Category (merged)
        const retailChart = mergeSeriesByDate([
          { key: 'total', data: formatIsoDate(totalRetail) },
          { key: 'foodServices', data: formatIsoDate(foodServices) },
          { key: 'generalMerch', data: formatIsoDate(generalMerch) },
        ]);

        // Chart 3: Saving Rate vs Income (merged with transform)
        const savingsChart = mergeSeriesByDate([
          { key: 'savingRate', data: formatIsoDate(savingRate) },
          {
            key: 'disposableIncome',
            data: formatIsoDate(dispIncome),
            transform: (v) => v / 1000 // Convert billions to trillions
          },
        ]);

        // Chart 4: Sentiment & Confidence (merged)
        const sentimentChart = mergeSeriesByDate([
          { key: 'sentiment', data: formatIsoDate(sentiment) },
          { key: 'confidence', data: formatIsoDate(confidence) },
        ]);

        setData({ pceChart, retailChart, savingsChart, sentimentChart });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load consumer spending data'));
        console.error('Error loading consumer spending data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isActive, oneYearAgo, formatIsoDate]);

  return { data, loading, error };
}
```

### 6. Testing Pattern (`hooks/__tests__/useInflationData.test.ts`)

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

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

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

  it('should fetch all 7 inflation series', async () => {
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

---

## 📋 Step-by-Step Implementation Plan

### Phase 2.1: Setup & Infrastructure ⚙️

**Priority: HIGH**

**Tasks:**
1. ✅ Create directory structure
   ```bash
   mkdir -p app/hooks/{domain,shared,__tests__}
   ```

2. ✅ Install testing dependencies
   ```bash
   npm install --save-dev @testing-library/react @testing-library/react-hooks
   ```

3. ✅ Create shared utilities
   - `app/hooks/shared/types.ts` - All TypeScript interfaces
   - `app/hooks/shared/useDateRange.ts` - Date calculation hook
   - `app/hooks/shared/useDataFormatter.ts` - Data formatting utilities

4. ✅ Create barrel export
   - `app/hooks/index.ts` - Export all hooks for easy importing

**Verification:**
- [ ] Directories exist
- [ ] Dependencies installed
- [ ] TypeScript compiles without errors
- [ ] Shared utilities are reusable

---

### Phase 2.2: Pilot Implementation (Inflation Hook) 🚀

**Priority: HIGH**

**Why Inflation First?**
- Representative complexity (7 series, monthly formatting)
- Not too simple, not too complex
- Good pattern to replicate

**Tasks:**
1. ✅ Implement `useInflationData` hook
   - Follow the template above
   - Use shared utilities (useDateRange, useDataFormatter)

2. ✅ Write comprehensive tests
   - Inactive state test
   - Active loading test
   - Error handling test
   - Series count verification test

3. ✅ Integrate into page.tsx
   ```typescript
   // Replace this:
   const [coreCpiData, setCoreCpiData] = useState<ChartData[]>([]);
   // ... 6 more useState + 1 useEffect

   // With this:
   const inflation = useInflationData(activeSection === 'inflation');

   // Update JSX:
   <Chart data={inflation.data.coreCpi} />
   ```

4. ✅ Test manually
   - Navigate to Inflation section
   - Verify data loads
   - Check loading spinner
   - Test error scenarios (disable API key temporarily)

**Verification:**
- [ ] Tests pass with >90% coverage
- [ ] Inflation section works identically to before
- [ ] No console errors
- [ ] Loading state displays correctly

---

### Phase 2.3: Implement Remaining Hooks 🔄

**Priority: MEDIUM** (Order: Simple → Complex)

**Hook Implementation Order:**

**1. useEmploymentData** (Simple)
   - 4 series, monthly formatting
   - Similar to inflation
   - Time estimate: 1-2 hours

**2. useHousingData** (Simple)
   - 7 series, monthly formatting
   - Similar to inflation
   - Time estimate: 1-2 hours

**3. useExchangeRatesData** (Simple)
   - 9 series, monthly formatting
   - More series but same pattern
   - Time estimate: 1-2 hours

**4. useEconomicGrowthData** (Medium)
   - 5 series, mixed quarterly/monthly
   - Uses both oneYearAgo and twoYearsAgo
   - Time estimate: 2-3 hours

**5. useKeyIndicatorsData** (Medium - Special)
   - 8 series, loads on mount (not by section)
   - No `isActive` parameter needed
   - Time estimate: 2-3 hours

**6. useMarketIndicesData** (Complex)
   - 7 series, uses mergeSeriesByDate
   - Three-year date range
   - Time estimate: 3-4 hours

**7. useConsumerSpendingData** (Most Complex)
   - 10 series, multiple mergeSeriesByDate calls
   - Transform function for disposableIncome
   - Time estimate: 3-4 hours

**For Each Hook:**
1. Implement hook following inflation pattern
2. Write tests (4-5 test cases minimum)
3. Integrate into page.tsx
4. Verify functionality
5. Commit and move to next

---

### Phase 2.4: Integration & Cleanup 🧹

**Priority: MEDIUM**

**Tasks:**
1. ✅ Remove old useState declarations from page.tsx
   - Delete all 48 useState hooks

2. ✅ Remove old useEffect hooks from page.tsx
   - Delete all 8 useEffect hooks

3. ✅ Update imports in page.tsx
   ```typescript
   import {
     useInflationData,
     useEmploymentData,
     useEconomicGrowthData,
     useHousingData,
     useExchangeRatesData,
     useConsumerSpendingData,
     useMarketIndicesData,
     useKeyIndicatorsData,
   } from './hooks';
   ```

4. ✅ Clean up page.tsx structure
   - Organize hook calls at top of component
   - Group related JSX sections
   - Remove commented-out code

5. ✅ Verify all sections work
   - Test navigation between all 8 sections
   - Check loading states
   - Verify data displays correctly

**Verification:**
- [ ] page.tsx is ~600-800 lines (down from 1,817)
- [ ] All sections load correctly
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Performance is same or better

---

### Phase 2.5: Testing & Documentation 📝

**Priority: HIGH**

**Tasks:**
1. ✅ Complete test coverage for all 8 hooks
   - Target: >90% coverage per hook
   - Run: `npm test -- --coverage`

2. ✅ Add JSDoc comments to all hooks
   ```typescript
   /**
    * Custom hook for loading and managing inflation data.
    *
    * Fetches 7 inflation-related series from FRED API when the section is active.
    * Data is cached using getFredSeriesCached for performance.
    *
    * @param isActive - Whether this section is currently active
    * @returns Object containing inflation data, loading state, and error
    *
    * @example
    * ```tsx
    * const inflation = useInflationData(activeSection === 'inflation');
    *
    * if (inflation.loading) return <LoadingSpinner />;
    * if (inflation.error) return <ErrorMessage error={inflation.error} />;
    *
    * return <Chart data={inflation.data.coreCpi} />;
    * ```
    */
   ```

3. ✅ Update README with hooks documentation
   - Document hook architecture
   - Provide usage examples
   - Explain testing approach

4. ✅ Create HOOKS.md documentation
   - List all available hooks
   - Document parameters and return values
   - Provide integration examples

**Verification:**
- [ ] All tests pass (`npm test`)
- [ ] Coverage >90% for all hooks
- [ ] Documentation is clear and complete
- [ ] Examples are executable

---

## ✅ Verification Checklist

### Per Hook Verification
- [ ] Unit tests pass with >90% coverage
- [ ] Hook returns correct TypeScript types
- [ ] Loading states transition correctly
- [ ] Error handling captures failures
- [ ] Data formatting matches original behavior
- [ ] No memory leaks (useEffect cleanup if needed)

### Integration Verification
- [ ] All 8 sections load data correctly
- [ ] Switching between sections works smoothly
- [ ] No duplicate API calls (caching works)
- [ ] Performance is unchanged or improved
- [ ] No console errors or warnings

### Regression Testing
- [ ] All existing functionality works
- [ ] Charts render identically
- [ ] Date ranges match previous behavior
- [ ] Data formatting is exact
- [ ] Loading spinners appear correctly

---

## 📊 Success Metrics

### Quantitative Goals
- ✅ Reduce page.tsx from **1,817 lines** to **~600-800 lines** (55-60% reduction)
- ✅ Reduce useState hooks from **48** to **~8-9** domain hook results
- ✅ Reduce useEffect hooks from **8** to **0** (all in custom hooks)
- ✅ Test coverage **>90%** for all domain hooks
- ✅ No performance regression (measure initial load time)

### Qualitative Goals
- ✅ Code is easier to read and understand
- ✅ Hooks are reusable in other components (e.g., mobile view, dashboard widgets)
- ✅ Logic is isolated and testable
- ✅ Future changes are easier (modify one hook vs 200-line useEffect)
- ✅ Type safety is maintained throughout

---

## 🎓 Learning Objectives

### Concepts You'll Master

**1. Custom Hooks Patterns**
- When to extract logic into custom hooks
- How to design reusable hook APIs
- Managing complex state within hooks
- Handling side effects (data fetching) in hooks

**2. Composition Over Inheritance**
- Sharing logic through hooks instead of HOCs
- Building complex hooks from simpler ones
- Keeping hooks focused and single-purpose

**3. Testing React Hooks**
- Using `@testing-library/react` for hook testing
- Mocking dependencies with Vitest
- Testing async behavior with `waitFor`
- Achieving high test coverage

**4. Performance Optimization**
- Using `useMemo` and `useCallback` appropriately
- Preventing unnecessary re-renders
- Understanding React's rendering lifecycle

### Questions to Test Understanding

**Q1:** Why use custom hooks instead of just extracting functions?
<details>
<summary>Answer</summary>
Custom hooks can use React's state and lifecycle features (useState, useEffect, etc.). Regular functions cannot. Hooks give you access to React's reactivity system while keeping logic reusable.
</details>

**Q2:** Why does `useInflationData` take `isActive` as a parameter instead of reading `activeSection` directly?
<details>
<summary>Answer</summary>
Separation of concerns. The hook shouldn't know about the parent component's state structure. By passing `isActive`, the hook is more reusable - it can be used in any context where you need to conditionally load inflation data, not just with `activeSection`.
</details>

**Q3:** Why use `useMemo` in `useDateRange` instead of calculating dates directly?
<details>
<summary>Answer</summary>
Date calculations are called on every render. `useMemo` with empty dependencies `[]` ensures dates are calculated only once and cached. This prevents unnecessary recalculations and keeps date strings stable across renders, which is important for useEffect dependencies.
</details>

**Q4:** In the Consumer Spending hook, why keep ISO date format when using `mergeSeriesByDate`?
<details>
<summary>Answer</summary>
`mergeSeriesByDate` expects ISO format dates (YYYY-MM-DD) to align data correctly by date. Short formats like "Jan" lose year information and can cause misalignment. ISO format ensures accurate date-based merging.
</details>

---

## 🔍 Edge Cases & Considerations

### Edge Case 1: Key Indicators (Loads on Mount)

**Issue:** Key indicators load immediately on mount, not when section changes.

**Solution:**
```typescript
export function useKeyIndicatorsData() {
  // No isActive parameter - always loads
  useEffect(() => {
    loadData();
  }, []); // Empty deps = run once on mount
}

// In page.tsx:
const keyIndicators = useKeyIndicatorsData(); // No condition needed
```

### Edge Case 2: Mixed Date Ranges

**Issue:** Economic Growth uses different date ranges for different series.

**Solution:**
```typescript
const { oneYearAgo, twoYearsAgo } = useDateRange();

const [realGdp, nominalGdp, industrialProd, retailSales, capacityUtil] = await Promise.all([
  getFredSeriesCached('A191RL1Q225SBEA', twoYearsAgo),  // Quarterly - need more history
  getFredSeriesCached('A191RP1Q027SBEA', twoYearsAgo),  // Quarterly
  getFredSeriesCached('INDPRO', oneYearAgo),            // Monthly
  getFredSeriesCached('RSAFS', oneYearAgo),             // Monthly
  getFredSeriesCached('TCU', oneYearAgo),               // Monthly
]);
```

### Edge Case 3: Transform Functions in mergeSeriesByDate

**Issue:** Disposable income needs conversion from billions to trillions.

**Solution:**
```typescript
const savingsChart = mergeSeriesByDate([
  { key: 'savingRate', data: formatIsoDate(savingRate) },
  {
    key: 'disposableIncome',
    data: formatIsoDate(dispIncome),
    transform: (v) => v / 1000 // Convert billions to trillions for scale
  },
]);
```

### Edge Case 4: Error Handling

**Issue:** Need to handle API failures gracefully without crashing UI.

**Solution:**
```typescript
try {
  const data = await Promise.all([...]);
  setData(formatData(data));
} catch (err) {
  setError(err instanceof Error ? err : new Error('Failed to load data'));
  console.error('Error loading data:', err);
} finally {
  setLoading(false); // Always stop loading spinner
}

// In component:
if (inflation.error) {
  return <ErrorMessage>Failed to load inflation data</ErrorMessage>;
}
```

---

## 📦 Critical Files

### Files to Create (15 new files)

**Shared Utilities (3 files):**
1. `app/hooks/shared/types.ts` - TypeScript interfaces
2. `app/hooks/shared/useDateRange.ts` - Date calculations
3. `app/hooks/shared/useDataFormatter.ts` - Data formatting

**Domain Hooks (8 files):**
4. `app/hooks/domain/useInflationData.ts`
5. `app/hooks/domain/useEmploymentData.ts`
6. `app/hooks/domain/useEconomicGrowthData.ts`
7. `app/hooks/domain/useHousingData.ts`
8. `app/hooks/domain/useExchangeRatesData.ts`
9. `app/hooks/domain/useConsumerSpendingData.ts`
10. `app/hooks/domain/useMarketIndicesData.ts`
11. `app/hooks/domain/useKeyIndicatorsData.ts`

**Tests (8 files):**
12. `app/hooks/__tests__/useInflationData.test.ts`
13. `app/hooks/__tests__/useEmploymentData.test.ts`
14. `app/hooks/__tests__/useEconomicGrowthData.test.ts`
15. `app/hooks/__tests__/useHousingData.test.ts`
16. `app/hooks/__tests__/useExchangeRatesData.test.ts`
17. `app/hooks/__tests__/useConsumerSpendingData.test.ts`
18. `app/hooks/__tests__/useMarketIndicesData.test.ts`
19. `app/hooks/__tests__/useKeyIndicatorsData.test.ts`

**Barrel Export (1 file):**
20. `app/hooks/index.ts`

### Files to Modify (1 file)

1. `app/page.tsx` - Replace 48 useState + 8 useEffect with 8 hook calls

---

## 🚀 Getting Started

### Prerequisites
- Node.js >=20.9.0
- All dependencies installed (`npm install`)
- Vitest configured and working (`npm test`)

### Installation Steps

```bash
# 1. Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/react-hooks

# 2. Create directory structure
mkdir -p app/hooks/{domain,shared,__tests__}

# 3. Verify setup
npm test  # Should pass existing tests
npm run build  # Should compile without errors
```

### Implementation Workflow

```bash
# For each hook (start with useInflationData):

# 1. Create shared utilities first (if not done)
# - app/hooks/shared/types.ts
# - app/hooks/shared/useDateRange.ts
# - app/hooks/shared/useDataFormatter.ts

# 2. Implement the hook
# - app/hooks/domain/useInflationData.ts

# 3. Write tests
# - app/hooks/__tests__/useInflationData.test.ts
npm test useInflationData  # Run specific test

# 4. Integrate into page.tsx
# - Replace useState/useEffect with hook call

# 5. Verify manually
npm run dev
# Navigate to Inflation section, verify it works

# 6. Commit
git add .
git commit -m "feat: Add useInflationData custom hook"

# 7. Move to next hook
```

---

## 🎯 Migration Strategy: Incremental Wins

**Why Incremental?**
- Lower risk (can rollback individual hooks)
- Easier to test and verify
- Learn and adjust pattern between implementations
- Can merge PRs incrementally
- page.tsx continues working throughout

**Process Per Domain:**
1. ✅ Implement hook (1-3 hours)
2. ✅ Write tests (30 min - 1 hour)
3. ✅ Integrate into page.tsx (15-30 min)
4. ✅ Verify manually (15 min)
5. ✅ Commit and push (5 min)
6. ✅ Move to next domain

**Total Time Estimate:**
- Setup (Phase 2.1): 1-2 hours
- Pilot (Phase 2.2): 3-4 hours
- Remaining 7 hooks (Phase 2.3): 14-20 hours
- Integration (Phase 2.4): 2-3 hours
- Testing/Docs (Phase 2.5): 2-3 hours
- **Total: ~22-32 hours** (3-4 days of focused work)

---

## 📖 Further Reading

### React Hooks Best Practices
- [React Docs: Building Your Own Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [React Hooks Patterns](https://kentcdodds.com/blog/react-hooks-pitfalls)
- [Testing Custom Hooks](https://react-hooks-testing-library.com/)

### Testing Resources
- [Vitest Documentation](https://vitest.dev/)
- [@testing-library/react Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing React Hooks Guide](https://kentcdodds.com/blog/how-to-test-custom-react-hooks)

### TypeScript Patterns
- [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Effective TypeScript Book](https://effectivetypescript.com/)

---

## Summary

Phase 2 transforms your 1,817-line monolithic component into a clean, maintainable architecture:

**Before:**
- 48 useState hooks scattered throughout
- 8 nearly-identical useEffect hooks
- Difficult to test, reuse, or maintain

**After:**
- 8 domain-specific custom hooks
- Shared utilities for common patterns
- >90% test coverage
- Reusable across components
- 60% reduction in page.tsx size

**Key Principles:**
1. **Self-contained domain hooks** - Each manages its own state
2. **Shared utilities** - DRY principle for dates/formatting
3. **Incremental migration** - One domain at a time
4. **Comprehensive testing** - >90% coverage
5. **Pattern replication** - Establish with inflation, repeat 7 times

Phase 2.1 and 2.2 are complete. Phase 2.3 (remaining 7 hooks) is next.

---

# Phase 2.2 Review & Test Plan

## What This Section Is

Phase 2.2 is done: `useInflationData` is implemented, tested (13/13 pass), integrated into `page.tsx`, and pushed. This section does two things:

1. **Review checklist** — a structured walkthrough to verify everything is correct before moving on
2. **Beginner tutorial** — explains *why* every decision in Phase 2.2 was made, not just *what* was done

---

## Review Checklist

Run these in order. Each item has a pass/fail criterion.

### Step 1: Tests pass cleanly
```bash
npx vitest run app/hooks/__tests__/useInflationData.test.ts
```
**Pass:** 13 tests, 0 failures, 0 warnings.

### Step 2: TypeScript compiles
```bash
npx tsc --noEmit
```
**Pass:** Zero errors output.

### Step 3: Verify the test file covers what it claims

Open `app/hooks/__tests__/useInflationData.test.ts` and confirm each `describe` block maps to a real risk:

| describe block | Risk it guards against |
|---|---|
| Inactive State | Hook fires network requests even when the tab isn't visible |
| Active State – Successful Loading | Hook fails to fetch or format data correctly |
| Error Handling | An API crash brings down the whole UI |
| Data Formatting | Dates or numbers come through as wrong types |
| Activation/Deactivation | Switching tabs causes duplicate fetches or loses data |
| Date Range | The start-date sent to FRED is wrong |

### Step 4: Verify page.tsx integration is clean

Open `app/page.tsx`. Search for these strings — **none** should exist:

- `coreCpiData` (old state variable name)
- `setPceData` (old setter)
- `inflationLoading` (old loading flag)
- `setInflationLoading`
- `loadInflationData` (old useEffect function name)

Search for these — **all** should exist exactly once:

- `useInflationData`
- `inflation.loading`
- `inflation.data.coreCpi`
- `inflation.error`

### Step 5: Coverage config gap (known, non-blocking)

`vitest.config.ts` has `coverage.include: ['app/lib/**/*.ts']`. This does **not** cover `app/hooks/**/*.ts`. Coverage reports will silently exclude the new hooks. This should be fixed before Phase 2.3, but it does not block the current review.

---

# Beginner Tutorial: Why Phase 2.2 Was Built This Way

This tutorial walks through the actual code that was written and explains the reasoning behind each decision. You do not need to understand React deeply to follow it — each section starts with the problem, then shows how the code solves it.

---

## 1. Why extract a hook at all?

### The problem (before)

In `page.tsx`, the inflation section looked like this:

```typescript
// 8 separate state declarations
const [coreCpiData, setCoreCpiData] = useState<ChartData[]>([]);
const [pceData, setPceData] = useState<ChartData[]>([]);
const [corePceData, setCorePceData] = useState<ChartData[]>([]);
const [foodCpiData, setFoodCpiData] = useState<ChartData[]>([]);
const [energyCpiData, setEnergyData] = useState<ChartData[]>([]);
const [housingCpiData, setHousingCpiData] = useState<ChartData[]>([]);
const [medicalCpiData, setMedicalCpiData] = useState<ChartData[]>([]);
const [inflationLoading, setInflationLoading] = useState(false);

// ~40-line useEffect that fetches, formats, and sets all 8 pieces of state
useEffect(() => {
  async function loadInflationData() {
    if (activeSection !== 'inflation') return;
    setInflationLoading(true);
    try {
      const [coreCpi, pce, ...] = await Promise.all([...]);
      setCoreCpiData(formatData(coreCpi));
      setPceData(formatData(pce));
      // ... 5 more setters ...
    } finally {
      setInflationLoading(false);
    }
  }
  loadInflationData();
}, [activeSection]);
```

This pattern repeated 8 times (once per domain) in the same file. Page.tsx was 1,817 lines. The inflation block alone was ~50 lines of boilerplate that looked nearly identical to the employment block, the housing block, and so on.

### The solution (after)

```typescript
// 1 line replaces 8 state declarations + 40-line useEffect
const inflation = useInflationData(activeSection === 'inflation');

// Usage in JSX is the same, just shorter:
<Chart data={inflation.data.coreCpi} />
```

**Why this matters:** The loading logic, error handling, and data formatting are now *inside the hook*. If there's a bug in how inflation data is fetched, you look in one 91-line file instead of scrolling through a 1,800-line component. The same pattern can be copy-pasted for every other domain.

---

## 2. Why does the hook take `isActive: boolean` instead of reading `activeSection` directly?

### The code

```typescript
// useInflationData.ts
export function useInflationData(isActive: boolean): DomainHookResult<InflationData> {
  // ...
  useEffect(() => {
    if (!isActive) return;  // ← early exit when not the active tab
    // ... fetch data ...
  }, [isActive, oneYearAgo, formatMonthly]);
}

// page.tsx — the caller decides what "active" means
const inflation = useInflationData(activeSection === 'inflation');
```

### Why not this instead?

```typescript
// This is what you might write first — it works, but has a problem:
export function useInflationData() {
  const { activeSection } = useContext(SomeContext);  // reads global state directly
  useEffect(() => {
    if (activeSection !== 'inflation') return;
    // ...
  }, [activeSection]);
}
```

The second version *couples* the hook to the app's navigation system. If you ever rename `'inflation'` to `'cpi'`, or use this hook in a different page that has no `activeSection`, the hook breaks. The `isActive` version is **reusable** — it doesn't care *why* it's active or inactive, just *whether* it is. The caller decides.

This is called **separation of concerns**: the hook owns "how to fetch inflation data when told to", and the component owns "when inflation should be fetched".

---

## 3. Why `useMemo` in `useDateRange`?

### The code

```typescript
// useDateRange.ts
export function useDateRange() {
  return useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    // ... twoYearsAgo, threeYearsAgo ...
    return {
      oneYearAgo: oneYearAgo.toISOString().split('T')[0],  // "2025-02-03"
      // ...
    };
  }, []);  // ← empty array = compute once, never again
}
```

### Why not just calculate the date inline?

```typescript
// This looks simpler, but causes an infinite loop:
export function useInflationData(isActive: boolean) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateStr = oneYearAgo.toISOString().split('T')[0];

  useEffect(() => {
    // fetch using dateStr ...
  }, [isActive, dateStr]);  // ← dateStr is a NEW string every render
}
```

Here's what happens without `useMemo`:

1. Component renders → `dateStr` is created as a new string object
2. `useEffect` sees its dependency (`dateStr`) changed (even though the value is the same, it's a new object)
3. `useEffect` runs → fetches data → calls `setData` → triggers a re-render
4. Go back to step 1. Infinite loop.

`useMemo` with `[]` runs the calculation **once** and returns the same object on every subsequent render. The `useEffect` dependency check sees "same object" and does not re-run.

---

## 4. Why `useCallback` in `useDataFormatter`?

### The code

```typescript
// useDataFormatter.ts
const formatMonthly = useCallback((data: FredSeriesData[]): ChartData[] =>
  data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
    value: parseFloat(d.value),
  })), []);  // ← same empty-deps trick as useMemo
```

### Same problem as useDateRange, different shape

`formatMonthly` is a **function**. Without `useCallback`, a new function object is created on every render. It's listed in `useInflationData`'s `useEffect` dependency array:

```typescript
useEffect(() => {
  // ...
}, [isActive, oneYearAgo, formatMonthly]);  // ← formatMonthly must be stable
```

If `formatMonthly` were recreated every render, `useEffect` would re-run every render. `useCallback` with `[]` ensures it's the same function reference across renders.

**Rule of thumb:** If you put a function or object in a `useEffect` dependency array, it needs to be wrapped in `useCallback` or `useMemo`.

---

## 5. Why `DomainHookResult<T>` — what are generics?

### The code

```typescript
// types.ts
export interface DomainHookResult<T> {
  data: T;           // ← T is a placeholder for any type
  loading: boolean;
  error: Error | null;
}

// Used like this:
function useInflationData(...): DomainHookResult<InflationData> { ... }
function useEmploymentData(...): DomainHookResult<EmploymentData> { ... }
```

### What `<T>` means

`T` is a **type parameter** — a placeholder that gets filled in when you use the interface. Think of it as a template:

- `DomainHookResult<InflationData>` becomes `{ data: InflationData; loading: boolean; error: Error | null }`
- `DomainHookResult<EmploymentData>` becomes `{ data: EmploymentData; loading: boolean; error: Error | null }`

### Why not write two separate interfaces?

```typescript
// Without generics — repetitive:
interface InflationHookResult {
  data: InflationData;
  loading: boolean;
  error: Error | null;
}
interface EmploymentHookResult {
  data: EmploymentData;
  loading: boolean;
  error: Error | null;
}
// ... 6 more identical shapes ...
```

Generics eliminate that repetition. The `loading` and `error` pattern is the same for every hook — only `data` changes shape. One interface, parameterized.

---

## 6. Why `Promise.all` for the 7 API calls?

### The code

```typescript
const [coreCpi, pce, corePce, foodCpi, energyCpi, housingCpi, medicalCpi] =
  await Promise.all([
    getFredSeriesCached('CPILFESL', oneYearAgo),
    getFredSeriesCached('PCEPI', oneYearAgo),
    getFredSeriesCached('PCEPILFE', oneYearAgo),
    getFredSeriesCached('CPIUFDSL', oneYearAgo),
    getFredSeriesCached('CPIENGSL', oneYearAgo),
    getFredSeriesCached('CUSR0000SAH', oneYearAgo),
    getFredSeriesCached('CPIMEDSL', oneYearAgo),
  ]);
```

### Sequential vs parallel

```typescript
// Sequential — each call waits for the previous one to finish:
const coreCpi = await getFredSeriesCached('CPILFESL', oneYearAgo);   // 200ms
const pce     = await getFredSeriesCached('PCEPI', oneYearAgo);      // 200ms
// Total: ~1400ms (7 × 200ms)

// Parallel — all calls start at the same time:
const [coreCpi, pce, ...] = await Promise.all([...]);
// Total: ~200ms (the slowest single call)
```

`Promise.all` fires all 7 requests simultaneously. The `await` waits for **all** of them to finish before continuing. If any one rejects (throws an error), the whole `Promise.all` rejects — which is exactly what we want, because the `catch` block handles it uniformly.

**Trade-off:** If one series fails, all 7 are lost. For a dashboard where partial data display would be better, you'd use `Promise.allSettled` instead. The current design chose simplicity: all-or-nothing, with a clear error state.

---

## 7. Why the `instanceof Error` check in the catch block?

### The code

```typescript
} catch (err) {
  setError(err instanceof Error ? err : new Error('Failed to load inflation data'));
}
```

### Why not just `setError(err)`?

TypeScript's `catch` block types `err` as `unknown` — it could be anything. JavaScript lets you `throw` any value:

```typescript
throw new Error('something broke');  // an Error object
throw 'something broke';             // a plain string
throw 42;                            // a number
throw { code: 404, msg: 'nope' };   // a random object
```

The `error` state is typed as `Error | null`. If someone throws a string, you can't put it directly into state. The `instanceof` check:

- If `err` is already an `Error` → use it as-is (preserves the original stack trace and message)
- If `err` is anything else → wrap it in a `new Error(...)` with a safe fallback message

This is a standard defensive pattern. The test suite verifies both branches:
- `mockRejectedValue(new Error('API failure'))` → error message is `'API failure'`
- `mockRejectedValue('String error')` → error message is `'Failed to load inflation data'`

---

## 8. Why happy-dom? Why not jsdom?

### The test environment decision

The tests use `renderHook` from `@testing-library/react`, which needs a browser-like environment (it needs `document`, `window`, etc.). Vitest can run in two environments:

| Environment | What it is | Pros | Cons |
|---|---|---|---|
| `node` | No DOM at all | Fast, lightweight | `renderHook` crashes: "document is not defined" |
| `jsdom` | Full DOM simulation | Mature, well-known | Heavy, slower, compatibility issues with React 19 |
| `happy-dom` | Lighter DOM simulation | Fast, works with React 19 | Slightly less feature-complete than jsdom |

This project uses React 19.2.3. `happy-dom` was chosen because it works out of the box with React 19 and `@testing-library/react` v16, and it's faster than jsdom. The tests here don't need obscure DOM APIs — just enough for React to mount hooks — so happy-dom is sufficient.

---

## 9. How do `renderHook` and `waitFor` work?

### renderHook

Custom hooks can't be called directly in a test — React hooks must be called inside a React component. `renderHook` creates a minimal wrapper component for you:

```typescript
const { result } = renderHook(() => useInflationData(true));
//                              ↑ this is called inside a tiny component

result.current.loading  // access the hook's return value
```

`result.current` always points to the hook's most recent return value. After state updates, `result.current` updates automatically.

### waitFor

State updates in React are **asynchronous**. When the hook's `useEffect` runs and eventually calls `setLoading(false)`, that state change doesn't happen instantly in the test. `waitFor` repeatedly checks its callback until it stops throwing:

```typescript
await waitFor(() => {
  expect(result.current.loading).toBe(false);
  // ↑ if this throws (loading is still true), waitFor retries
  // once it passes, waitFor resolves
});
```

Without `waitFor`, you'd assert on the *initial* state before the async fetch completes, and the test would fail or give false positives.

---

## 10. Comprehension Questions

Work through these before moving to Phase 2.3. They test whether the *why* has landed, not just the *what*.

**Q1:** A colleague suggests removing `useMemo` from `useDateRange` because "the date calculation is trivial and fast." Are they right? Explain what would happen.

**Q2:** You want to reuse `useInflationData` in a mobile dashboard component that has no `activeSection` state — it always shows inflation data. How would you call the hook? Does it need to change?

**Q3:** The error test mocks `getFredSeriesCached` to reject with `'String error'` (a plain string). Why does the test assert `error.message === 'Failed to load inflation data'` instead of `error.message === 'String error'`? Trace through the code to explain.

**Q4:** If you changed `Promise.all` to sequential `await` calls, would the tests still pass? Would anything break? Think about timing.

**Q5:** Why does the "Activation/Deactivation" test group deactivate and then reactivate the hook, instead of just calling it twice with `true`? What scenario is it actually testing?

**Q6:** `useDataFormatter` wraps each function in `useCallback`. If you removed `useCallback` from `formatMonthly` but left it on the others, which tests would fail and why?

---

## 11. Suggested Learning Path

These resources are ordered: start at the top, go as deep as your curiosity takes you. Each one is linked to the specific concept it teaches.

### React Hooks — Core Concepts
- **React official docs: "Building Your Own Hooks"** — https://react.dev/learn/reusing-logic-with-custom-hooks
  - Read this first. It covers the rules of hooks, when to extract, and how hooks compose. The inflation hook is a direct application of everything on this page.
- **React official docs: "useEffect"** — https://react.dev/reference/react/useEffect
  - Pay close attention to the "dependencies" section. The `isActive`, `oneYearAgo`, `formatMonthly` dependency array in our hook is explained by this page.
- **React official docs: "useMemo"** — https://react.dev/reference/react/useMemo
  - Explains exactly the "new object every render" problem that `useDateRange` solves.
- **React official docs: "useCallback"** — https://react.dev/reference/react/useCallback
  - Same problem as useMemo, for functions. Maps directly to `useDataFormatter`.

### TypeScript — Generics
- **TypeScript Handbook: "Generics"** — https://www.typescriptlang.org/docs/handbook/2/generics.html
  - Section "Generic Functions" and "Generic Interfaces" are what you need. `DomainHookResult<T>` is a generic interface.

### Testing React Hooks
- **@testing-library/react docs** — https://testing-library.com/docs/react-testing-library/api/#renderhook
  - The `renderHook` API reference. Short and precise.
- **Vitest docs: "Mocking"** — https://vitest.dev/guide/mocking.html
  - Covers `vi.mock`, `vi.mocked`, `mockResolvedValue`, `mockRejectedValue` — all used in the inflation tests.
- **Kent C. Dodds: "How to test custom React hooks"** — https://kentcdodds.com/blog/how-to-test-custom-react-hooks
  - Practical walkthrough of the same patterns used here.

### Async JavaScript
- **MDN: Promise.all** — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
  - Explains the parallel execution model and the "fail fast" behavior on rejection.

---

## 12. What to Verify Before Starting Phase 2.3

Before implementing the next hook (`useEmploymentData`), confirm:

- [ ] `npx vitest run` — all tests pass (not just inflation)
- [ ] `npx tsc --noEmit` — zero TypeScript errors
- [ ] You can explain (out loud or in writing) why `useMemo` and `useCallback` are in the shared hooks
- [ ] You understand what `result.current` refers to in a `renderHook` test
- [ ] You've read the "Building Your Own Hooks" React doc linked above
- [ ] The vitest coverage `include` glob is updated to cover `app/hooks/**/*.ts` (fix this before Phase 2.3 so coverage reports are meaningful)

---

## 13. Phase 2.3 Execution Order

When you're ready, implement hooks in this order (simple → complex):

1. `useEmploymentData` — 4 series, monthly format. Closest to inflation. Good warm-up.
2. `useHousingData` — 7 series, monthly format. Same pattern, more fields.
3. `useExchangeRatesData` — 9 series, monthly format. More series, same structure.
4. `useEconomicGrowthData` — 5 series, **mixed date ranges** (some `oneYearAgo`, some `twoYearsAgo`). First hook that uses multiple date ranges.
5. `useKeyIndicatorsData` — 8 series, **no `isActive` param** (loads on mount). Breaks the pattern intentionally — understand why before implementing.
6. `useMarketIndicesData` — uses `mergeSeriesByDate`. First hook with merged charts.
7. `useConsumerSpendingData` — most complex: 10 series, multiple `mergeSeriesByDate`, transform function.

For each hook, follow the same checklist:
1. Create `app/hooks/domain/use<Name>.ts`
2. Write `app/hooks/__tests__/use<Name>.test.ts`
3. Update `app/hooks/index.ts` barrel export
4. Integrate into `page.tsx` (replace old useState + useEffect)
5. Run tests: `npx vitest run`
6. Run tsc: `npx tsc --noEmit`
7. Commit and push
