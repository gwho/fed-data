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

Ready to start with Phase 2.1: Setup & Infrastructure! 🚀
