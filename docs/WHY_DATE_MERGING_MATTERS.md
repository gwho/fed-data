# Why Date-Based Merging is Critical (Not Index-Based)

## The Problem with Index-Based Merging

### ❌ Dangerous Pattern (OLD approach in some charts)
```typescript
// WRONG: Merging by array index
data={seriesA.map((d, i) => ({
  date: d.date,
  valueA: d.value,
  valueB: seriesB[i]?.value || 0,  // ⚠️ DANGER!
}))}
```

### ✅ Safe Pattern (NEW approach in Consumer Spending)
```typescript
// CORRECT: Merging by date
const merged = mergeSeriesByDate([
  { key: 'valueA', data: seriesA },
  { key: 'valueB', data: seriesB },
]);
```

---

## Real-World Example: The Disaster Scenario

### Scenario: Comparing Retail Sales vs Food Services

**Series A (Total Retail Sales):**
```
Jan 2024: $700B
Feb 2024: $705B
Mar 2024: $710B
Apr 2024: $715B
```

**Series B (Food Services) - Missing February data:**
```
Jan 2024: $93B
Mar 2024: $94B
Apr 2024: $95B
```

### Index-Based Merge Result (WRONG ❌)

```typescript
retailSales.map((d, i) => ({
  date: d.date,
  retail: d.value,
  food: foodServices[i]?.value || 0,
}))
```

**Output:**
```
[
  { date: 'Jan', retail: 700, food: 93 },   ✓ Correct
  { date: 'Feb', retail: 705, food: 94 },   ✗ WRONG! Shows March food data in February
  { date: 'Mar', retail: 710, food: 95 },   ✗ WRONG! Shows April food data in March
  { date: 'Apr', retail: 715, food: 0 },    ✗ WRONG! Shows missing data
]
```

**Chart shows:** Food services jumped in Feb, then stayed flat, then dropped to zero! 📉 (Completely false!)

### Date-Based Merge Result (CORRECT ✅)

```typescript
mergeSeriesByDate([
  { key: 'retail', data: retailSales },
  { key: 'food', data: foodServices },
])
```

**Output:**
```
[
  { date: 'Jan', retail: 700, food: 93 },    ✓ Correct
  { date: 'Feb', retail: 705, food: null },  ✓ Correct - shows gap
  { date: 'Mar', retail: 710, food: 94 },    ✓ Correct
  { date: 'Apr', retail: 715, food: 95 },    ✓ Correct
]
```

**Chart shows:** Accurate trend with visible data gap in February 📊 (Truth!)

---

## Why This Happens

### Different Data Frequencies
```
GDP:        Q1────────Q2────────Q3────────Q4
Retail:     Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec
```

Merging quarterly GDP with monthly retail by index would plot Q1 GDP in January, Q2 in February, etc. - completely wrong!

### Missing Data Points
FRED data can have gaps due to:
- Holidays (markets closed)
- Reporting delays
- Data revisions
- Preliminary vs. final releases

### Different Date Ranges
```
Series A: 2023-01 to 2024-12  (24 months)
Series B: 2024-01 to 2024-12  (12 months)
```

Index `[0]` in A is Jan 2023, but in B is Jan 2024!

---

## Our Solution: `mergeSeriesByDate`

### How It Works

```typescript
export function mergeSeriesByDate(seriesConfigs: SeriesConfig[]): MergedDataPoint[] {
  // 1. Collect ALL unique dates from ALL series
  const dateSet = new Set<string>();
  seriesConfigs.forEach(config => {
    config.data.forEach(point => dateSet.add(point.date));
  });

  // 2. Sort dates chronologically
  const sortedDates = Array.from(dateSet).sort();

  // 3. Create lookup maps: date → value for each series
  const seriesMaps = seriesConfigs.map(config => {
    const map = new Map<string, number>();
    config.data.forEach(point => {
      map.set(point.date, point.value);
    });
    return { key: config.key, map };
  });

  // 4. Build merged points: for each date, lookup value in each series
  return sortedDates.map(date => {
    const point: MergedDataPoint = { date };
    
    seriesMaps.forEach(({ key, map }) => {
      point[key] = map.get(date) ?? null;  // null if missing!
    });

    return point;
  });
}
```

### Key Features

1. **Date-based matching:** Values matched by actual date, not position
2. **Null for missing:** Uses `null` (not `0` or `undefined`) so charts show gaps
3. **All dates included:** Union of all series dates
4. **Chronologically sorted:** Ensures proper time ordering
5. **Transform support:** Optional function to transform values (e.g., billions → trillions)

---

## Benefits

### ✅ Data Integrity
- Values always on correct dates
- No phantom data shifts
- Missing data clearly visible

### ✅ Correctness
- Works with different frequencies (daily, monthly, quarterly)
- Works with different date ranges
- Works with missing data points

### ✅ Transparency
- `null` values visible in tooltips as "N/A"
- Charts show gaps (if `connectNulls={false}`)
- Developers can debug data issues

### ✅ Performance
- O(n + m) complexity (linear)
- Maps provide O(1) lookups
- Efficient even with large datasets

---

## Formatting Helpers

### Why We Need Them

**Before (inconsistent):**
```typescript
// Developer A
formatter={(v) => `$${(v/1000).toFixed(1)}B`}

// Developer B  
formatter={(v) => `$${(v/1000).toFixed(2)}B`}

// Developer C
formatter={(v) => `${v/1000}B`}
```

**After (consistent):**
```typescript
import { formatBillions } from './utils/chartHelpers';

tickFormatter={formatBillions}
formatter={formatBillions}
```

### Available Formatters

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `formatTrillions(18234.5)` | Billions | `"$18.2T"` | PCE, GDP |
| `formatBillions(93234)` | Millions | `"$93.2B"` | Retail sales |
| `formatPercent(4.5)` | Number | `"4.5%"` | Rates, growth |
| `formatIndex(79.2)` | Number | `"79.2"` | Indices |

### Null Safety
All formatters handle `null` and `undefined`:
```typescript
formatBillions(null)      // => "N/A"
formatBillions(undefined) // => "N/A"
formatBillions(93234)     // => "$93.2B"
```

---

## Custom Tooltip Component

### Why We Need It

**Before (inconsistent, repetitive):**
```typescript
<Tooltip 
  formatter={(value, name) => {
    if (name === 'Saving Rate') return `${Number(value).toFixed(1)}%`;
    if (name === 'Income') return `$${(Number(value)/1000).toFixed(2)}T`;
    return Number(value).toFixed(2);
  }}
/>
```

**After (clean, reusable):**
```typescript
<Tooltip 
  content={
    <CustomTooltip 
      formatters={{
        savingRate: formatPercent,
        income: formatTrillions,
      }}
    />
  }
/>
```

### Features
- Shows formatted date header (e.g., "January 2024")
- Applies correct formatter per series
- Hides null/missing values automatically
- Consistent styling across all charts
- Color-coded with matching line colors

---

## Migration Guide

### Old Pattern (Employment section - still using index merge)
```typescript
data={unemploymentData.map((d, i) => ({
  date: d.date,
  unemployment: d.value,
  participation: laborForceData[i]?.value || 0,  // ⚠️ Risky
}))}
```

### New Pattern (Consumer Spending - using date merge)
```typescript
const chartData = mergeSeriesByDate([
  { key: 'unemployment', data: unemploymentData },
  { key: 'participation', data: laborForceData },
]);

<LineChart data={chartData}>
  <Line dataKey="unemployment" connectNulls={false} />
  <Line dataKey="participation" connectNulls={false} />
</LineChart>
```

### Key Differences
1. **Input format:** Keep ISO dates (`2024-01-01`) until merge
2. **Output format:** Single merged array with all series
3. **Missing data:** Represented as `null`, not `0`
4. **connectNulls:** Set to `false` to show gaps visually

---

## Summary

| Approach | Correct? | Safe? | Maintainable? | Performance |
|----------|----------|-------|---------------|-------------|
| Index-based `map((d,i)=>...)` | ❌ No | ❌ No | ❌ No | ✅ O(n) |
| Date-based `mergeSeriesByDate` | ✅ Yes | ✅ Yes | ✅ Yes | ✅ O(n+m) |

**Bottom line:** Always merge by date when combining multiple time series. It's the only way to guarantee data integrity.

---

## Files Changed in This Refactor

1. **`app/utils/chartHelpers.ts`** - New utility module
   - `mergeSeriesByDate()` function
   - Format helpers: `formatTrillions`, `formatBillions`, `formatPercent`, `formatIndex`
   - Type-safe with full TypeScript support

2. **`app/components/CustomTooltip.tsx`** - New tooltip component
   - Reusable across all charts
   - Custom formatter support
   - Null value handling
   - Consistent styling

3. **`app/page.tsx`** - Consumer Spending section
   - Uses `mergeSeriesByDate` for all 4 charts
   - Uses `CustomTooltip` for consistency
   - Uses format helpers for axes and tooltips
   - `connectNulls={false}` to show data gaps

4. **`app/lib/fredApi.ts`** - Added 7 new series
   - PCE, PCEDG, PCESV
   - RSFSDP, GAFO
   - PSAVERT, DSPI
   - UMCSENT, CSCICP03USM665S

---

## Testing the Fix

### Manual Test: Create Misaligned Data
```typescript
// In fredApi.ts, temporarily make data misaligned:
case 'PSAVERT':
  return [
    { date: '2024-01-01', value: '4.1' },
    // Skip Feb!
    { date: '2024-03-01', value: '4.2' },
    { date: '2024-04-01', value: '4.0' },
  ];
```

**Index merge would:** Show March value (4.2) in February slot

**Date merge does:** Show `null` in February, keeps March correct

### Verify in Browser
1. Run `npm run dev`
2. Navigate to Consumer Spending tab
3. Hover over charts - tooltips should skip null values
4. Check that all dates align properly

---

## Future Improvements

Consider refactoring these sections to use date-based merging:
- [ ] Inflation section (lines ~420-550)
- [ ] Employment section (lines ~670-780)
- [ ] Economic Growth section (lines ~820-920)
- [ ] Exchange Rates section (lines ~950-1050)
- [ ] Housing section (lines ~1090-1230)

Consumer Spending serves as the **reference implementation** for how to do it correctly.
