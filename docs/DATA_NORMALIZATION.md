# Data Frequency Normalization Guide

> Educational guide for normalizing time-series data of different frequencies in trading applications.

---

## Table of Contents

1. [Why Normalization Matters](#why-normalization-matters)
2. [FRED Data Frequencies](#fred-data-frequencies)
3. [Normalization Methods](#normalization-methods)
4. [TypeScript Implementation](#typescript-implementation)
5. [Python Reference (pandas)](#python-reference-pandas)
6. [Visual Examples](#visual-examples)
7. [Best Practices](#best-practices)
8. [Common Pitfalls](#common-pitfalls)
9. [Further Learning](#further-learning)

---

## Why Normalization Matters

### The Problem

When building trading signals from multiple economic indicators, you face a fundamental challenge: **data arrives at different frequencies**.

| Indicator | Frequency | Example Update Schedule |
|-----------|-----------|------------------------|
| VIX (VIXCLS) | Daily | Every trading day |
| Fed Funds Rate (FEDFUNDS) | Daily | Every business day |
| Unemployment (UNRATE) | Monthly | First Friday of month |
| CPI (CPIAUCSL) | Monthly | ~10th of each month |
| GDP (A191RL1Q225SBEA) | Quarterly | ~30 days after quarter end |

### Example Scenario

You want to calculate a composite signal combining VIX (fear gauge) with unemployment rate:

```
VIX Data (daily):              Unemployment (monthly):
2024-01-02: 14.8               2024-01-01: 3.7%
2024-01-03: 15.1               2024-02-01: 3.9%
2024-01-04: 14.9               2024-03-01: 3.8%
2024-01-05: 15.3
... (250+ data points)         ... (12 data points)
```

**The Question:** How do you combine these for January 15th? VIX has a value, but there's no unemployment reading until February!

### The Solution: Data Alignment

Normalization aligns all series to a **common timeline** by filling gaps intelligently. After normalization:

```
Date        | VIX   | Unemployment
------------|-------|-------------
2024-01-02  | 14.8  | 3.7%    (Jan 1 value carried forward)
2024-01-03  | 15.1  | 3.7%    (Jan 1 value carried forward)
2024-01-04  | 14.9  | 3.7%    (Jan 1 value carried forward)
...
2024-01-31  | 15.2  | 3.7%    (still Jan 1 value)
2024-02-01  | 14.1  | 3.9%    (new February value!)
```

---

## FRED Data Frequencies

### Daily Series

These update every trading/business day. Ideal for real-time analysis.

| Series ID | Name | Use Case |
|-----------|------|----------|
| VIXCLS | VIX Volatility Index | Market fear/complacency gauge |
| FEDFUNDS | Federal Funds Effective Rate | Monetary policy stance |
| GS10 | 10-Year Treasury Yield | Long-term rate expectations |
| TB3MS | 3-Month Treasury Bill | Short-term rate benchmark |
| DGS2, DGS5 | 2/5-Year Treasury | Yield curve analysis |

### Monthly Series

Most economic indicators are monthly. Plan for ~21 trading days between updates.

| Series ID | Name | Use Case |
|-----------|------|----------|
| CPIAUCSL | Consumer Price Index | Inflation tracking |
| UNRATE | Unemployment Rate | Labor market health |
| HOUST | Housing Starts | Construction activity |
| CSUSHPISA | Case-Shiller Home Prices | Housing market trends |
| PAYEMS | Nonfarm Payrolls | Job market strength |

### Quarterly Series

Least frequent but highly impactful. ~63 trading days between updates.

| Series ID | Name | Use Case |
|-----------|------|----------|
| A191RL1Q225SBEA | Real GDP Growth | Economic expansion/contraction |
| A191RP1Q027SBEA | Nominal GDP Growth | Output measurement |

---

## Normalization Methods

### Forward Fill (Last Observation Carried Forward)

**Best for:** Economic indicators, policy rates, any "sticky" data

**Concept:** The last known value remains valid until the next observation.

```
Original Monthly Data:         After Forward Fill to Daily:
Jan 1: 3.7%                    Jan 1:  3.7%
                               Jan 2:  3.7% (filled)
                               Jan 3:  3.7% (filled)
                               ...
                               Jan 31: 3.7% (filled)
Feb 1: 3.9%                    Feb 1:  3.9%
                               Feb 2:  3.9% (filled)
```

**Why it makes sense for economic data:**

When the Bureau of Labor Statistics reports unemployment at 3.7% on January 5th, that value IS the official unemployment rate until the next release. It doesn't change on January 15th just because we don't have a measurement - the economy's unemployment rate is still approximately 3.7%.

This is fundamentally different from, say, a stock price, which actually DOES change every second whether we measure it or not.

### Linear Interpolation

**Best for:** Price data, exchange rates, continuously-changing metrics

**Concept:** Assumes the value changed linearly between observations.

```
Original Data:                 After Linear Interpolation:
Jan 1:  100                    Jan 1:  100.00
                               Jan 2:  101.11 (interpolated)
                               Jan 3:  102.22 (interpolated)
                               Jan 4:  103.33 (interpolated)
                               Jan 5:  104.44 (interpolated)
                               ...
Jan 10: 110                    Jan 10: 110.00
```

**Formula:**

```
interpolated_value = v1 + (v2 - v1) * (days_from_v1 / total_days)
```

**CAUTION:** Don't use for economic releases! Linear interpolation implies knowledge we don't have.

### Comparison

| Method | Use When | Examples | Don't Use For |
|--------|----------|----------|---------------|
| Forward Fill | Value represents a "state" | GDP, Unemployment, Fed Funds | Stock prices |
| Interpolation | Value changes continuously | Stock prices, FX rates | Economic releases |
| None | Need to know where data is missing | Data quality analysis | Signal calculation |

---

## TypeScript Implementation

### Installation

The utilities are built into the project with zero dependencies:

```typescript
import {
  generateDateRange,
  detectFrequency,
  forwardFill,
  interpolateLinear,
  mergeMultipleSeries,
} from '@/app/lib/dataUtils';
```

### generateDateRange

Creates an array of daily dates between two endpoints.

```typescript
const dates = generateDateRange('2024-01-01', '2024-01-05');
// Returns: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']
```

**Implementation Notes:**

- Uses noon UTC internally to avoid timezone issues
- Throws an error if start > end
- Returns single-element array if start === end

### detectFrequency

Analyzes date patterns to determine data frequency.

```typescript
const monthlyData = [
  { date: '2024-01-01', value: '3.7' },
  { date: '2024-02-01', value: '3.9' },
  { date: '2024-03-01', value: '3.8' },
];

detectFrequency(monthlyData);
// Returns: 'monthly'
```

**How it works:**

1. Calculates day gaps between consecutive dates
2. Finds the median gap (robust to outliers)
3. Classifies based on gap ranges:
   - 1-5 days → 'daily'
   - 6-10 days → 'weekly'
   - 28-35 days → 'monthly'
   - 85-95 days → 'quarterly'

### forwardFill

Carries the last known value forward to fill gaps.

```typescript
const monthlyData = [
  { date: '2024-01-01', value: '3.7' },
  { date: '2024-02-01', value: '3.9' },
];

const dailyDates = ['2024-01-15', '2024-01-20', '2024-01-31', '2024-02-01'];

const filled = forwardFill(monthlyData, dailyDates);
// Returns:
// [
//   { date: '2024-01-15', value: '3.7' },  // Uses Jan 1 value
//   { date: '2024-01-20', value: '3.7' },  // Uses Jan 1 value
//   { date: '2024-01-31', value: '3.7' },  // Uses Jan 1 value
//   { date: '2024-02-01', value: '3.9' },  // Uses Feb 1 value
// ]
```

### interpolateLinear

Linear interpolation between known points.

```typescript
const priceData = [
  { date: '2024-01-01', value: '100' },
  { date: '2024-01-10', value: '110' },
];

const targets = ['2024-01-01', '2024-01-05', '2024-01-10'];

const interpolated = interpolateLinear(priceData, targets);
// Returns:
// [
//   { date: '2024-01-01', value: '100' },
//   { date: '2024-01-05', value: '105.56' },  // Halfway = 105.56
//   { date: '2024-01-10', value: '110' },
// ]
```

### mergeMultipleSeries

The main function for combining series of different frequencies.

```typescript
const vixData = [
  { date: '2024-01-01', value: '14.8' },
  { date: '2024-01-02', value: '15.1' },
  { date: '2024-01-03', value: '14.9' },
];

const unemploymentData = [
  { date: '2024-01-01', value: '3.7' },
];

const result = mergeMultipleSeries(
  [
    { key: 'vix', data: vixData },
    { key: 'unemployment', data: unemploymentData },
  ],
  { fillMethod: 'forward' }
);

// result.data:
// [
//   { date: '2024-01-01', vix: '14.8', unemployment: '3.7' },
//   { date: '2024-01-02', vix: '15.1', unemployment: '3.7' },
//   { date: '2024-01-03', vix: '14.9', unemployment: '3.7' },
// ]

// result.seriesInfo:
// [
//   { key: 'vix', originalFrequency: 'daily', originalCount: 3, filledCount: 0 },
//   { key: 'unemployment', originalFrequency: 'unknown', originalCount: 1, filledCount: 2 },
// ]
```

---

## Python Reference (pandas)

Many trading systems use Python for backtesting and analysis. Here's how the same operations work in pandas.

### Forward Fill

```python
import pandas as pd

# TypeScript forwardFill equivalent
def forward_fill(data: pd.DataFrame, target_dates: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Forward-fill sparse data to target dates.

    Args:
        data: DataFrame with DatetimeIndex and value column(s)
        target_dates: DatetimeIndex to fill values for

    Returns:
        DataFrame with values for all target dates
    """
    return data.reindex(target_dates).ffill()

# Example usage:
monthly_unemployment = pd.DataFrame(
    {'rate': [3.7, 3.9, 3.8]},
    index=pd.to_datetime(['2024-01-01', '2024-02-01', '2024-03-01'])
)

daily_dates = pd.date_range('2024-01-01', '2024-01-10', freq='D')
daily_unemployment = forward_fill(monthly_unemployment, daily_dates)
print(daily_unemployment)
# Output:
#             rate
# 2024-01-01   3.7
# 2024-01-02   3.7  # Forward-filled
# 2024-01-03   3.7  # Forward-filled
# ...
# 2024-01-10   3.7  # Forward-filled

# Even simpler one-liner:
df.resample('D').ffill()  # Resample to daily and forward fill
```

### Linear Interpolation

```python
# TypeScript interpolateLinear equivalent
def interpolate_linear(data: pd.DataFrame, target_dates: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Linear interpolation to target dates.
    """
    return data.reindex(target_dates).interpolate(method='time')

# Example:
prices = pd.DataFrame(
    {'price': [100.0, 110.0]},
    index=pd.to_datetime(['2024-01-01', '2024-01-10'])
)

daily = pd.date_range('2024-01-01', '2024-01-10', freq='D')
interpolated = interpolate_linear(prices, daily)
print(interpolated.round(2))
# Output:
#             price
# 2024-01-01  100.00
# 2024-01-02  101.11
# 2024-01-03  102.22
# ...
# 2024-01-10  110.00
```

### Merge Multiple Series

```python
def merge_multiple_series(
    series_dict: dict,
    fill_method: str = "forward"
) -> pd.DataFrame:
    """
    Merge multiple series to common dates.

    Args:
        series_dict: Dictionary mapping names to DataFrames
        fill_method: 'forward' or 'linear'

    Returns:
        DataFrame with all series aligned
    """
    # Collect all dates (union)
    all_dates = pd.DatetimeIndex([])
    for df in series_dict.values():
        all_dates = all_dates.union(df.index)
    all_dates = all_dates.sort_values()

    # Align each series
    aligned = {}
    for name, df in series_dict.items():
        if fill_method == "forward":
            aligned[name] = df.reindex(all_dates).ffill()
        else:
            aligned[name] = df.reindex(all_dates).interpolate(method='time')

    return pd.concat(aligned, axis=1)

# Example:
vix = pd.DataFrame({'vix': [14.8, 15.1, 14.9]},
                   index=pd.to_datetime(['2024-01-01', '2024-01-02', '2024-01-03']))

unemployment = pd.DataFrame({'rate': [3.7]},
                            index=pd.to_datetime(['2024-01-01']))

merged = merge_multiple_series({'VIX': vix, 'Unemployment': unemployment})
print(merged)
# Output:
#               VIX  Unemployment
#              vix          rate
# 2024-01-01  14.8           3.7
# 2024-01-02  15.1           3.7  # unemployment forward-filled
# 2024-01-03  14.9           3.7  # unemployment forward-filled
```

### pandas Cheat Sheet

| TypeScript Function | pandas Equivalent |
|---------------------|-------------------|
| `generateDateRange(start, end)` | `pd.date_range(start, end, freq='D')` |
| `forwardFill(data, targets)` | `df.reindex(targets).ffill()` |
| `interpolateLinear(data, targets)` | `df.reindex(targets).interpolate(method='time')` |
| `detectFrequency(data)` | `pd.infer_freq(df.index)` |
| `mergeMultipleSeries(series, config)` | `pd.concat([...], axis=1).ffill()` |

---

## Visual Examples

### Forward Fill vs Linear Interpolation

```
Original Monthly Data (unemployment rate):

     3.9% |                 ●─────────────────────────●
          |
     3.7% | ●
          |
          ─────────────────────────────────────────────
          Jan 1           Feb 1                   Mar 1


After FORWARD FILL to daily:

     3.9% |                 ████████████████████████████
          |                 │
     3.7% | ████████████████│
          |                 │
          ─────────────────────────────────────────────
          Jan 1           Feb 1                   Mar 1
                            ↑
                    New value released


After LINEAR INTERPOLATION to daily (DON'T USE FOR ECONOMIC DATA!):

     3.9% |                 ●─────────────────────────●
          |               ╱
          |             ╱
     3.7% | ●─────────╱
          |
          ─────────────────────────────────────────────
          Jan 1           Feb 1                   Mar 1
```

### Multi-Frequency Merge

```
BEFORE MERGE (native frequencies):
┌──────────────────────────────────────────────────────────┐
│ Daily VIX:       ●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─● │
│ Monthly CPI:     ●──────────────────────●─────────────────│
│ Quarterly GDP:   ●───────────────────────────────────────●│
└──────────────────────────────────────────────────────────┘
                 Jan          Feb          Mar

AFTER MERGE (all aligned to daily with forward-fill):
┌──────────────────────────────────────────────────────────┐
│ Daily VIX:       ●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─● │
│ Monthly CPI:     ●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─● │
│ Quarterly GDP:   ●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─● │
└──────────────────────────────────────────────────────────┘
              (All series now have values for every date)
```

---

## Best Practices

### Do's

1. **Use forward-fill for economic indicators**
   - GDP, unemployment, CPI represent a "state" until the next release
   - The value IS the current reality until superseded

2. **Use interpolation for market prices**
   - Stock prices, FX rates change continuously
   - Interpolation is a reasonable approximation

3. **Document your method choice**
   - Future maintainers need to understand why you chose forward-fill vs interpolation
   - Include comments explaining the rationale

4. **Handle edge cases explicitly**
   - What if a target date is before all source data?
   - Our implementation returns empty string (null-equivalent)

5. **Sort your data**
   - Binary search requires sorted data
   - Our functions sort internally, but pre-sorting is faster for repeated operations

### Don'ts

1. **Don't interpolate economic releases**
   ```typescript
   // WRONG: Implies GDP changed daily
   const dailyGdp = interpolateLinear(quarterlyGdp, dailyDates);

   // RIGHT: GDP is "sticky" until next release
   const dailyGdp = forwardFill(quarterlyGdp, dailyDates);
   ```

2. **Don't assume same-length arrays**
   ```typescript
   // WRONG: Assumes series have matching dates
   const combined = vixData.map((d, i) => ({
     date: d.date,
     vix: d.value,
     unemployment: unemploymentData[i].value,  // ❌ Different lengths!
   }));

   // RIGHT: Merge by date
   const result = mergeMultipleSeries([...], { fillMethod: 'forward' });
   ```

3. **Don't ignore timezone issues**
   ```typescript
   // WRONG: Can shift dates in negative timezones
   const date = new Date('2024-01-01');  // Midnight local time

   // RIGHT: Use noon UTC
   const date = new Date('2024-01-01T12:00:00Z');
   ```

---

## Common Pitfalls

### Pitfall 1: Off-by-One Date Errors

**Problem:** Parsing "2024-01-15" in timezone UTC-5 gives you January 14th!

```javascript
// In Eastern Time (UTC-5):
new Date('2024-01-15').toLocaleDateString()
// Returns: "1/14/2024" (WRONG!)
```

**Solution:** Use noon UTC when parsing date-only strings:

```typescript
new Date('2024-01-15T12:00:00Z').toISOString().split('T')[0]
// Returns: "2024-01-15" (CORRECT in all timezones)
```

### Pitfall 2: Extrapolation Without Realizing It

**Problem:** Requesting a date before any data exists.

```typescript
const data = [
  { date: '2024-02-01', value: '3.9' },
];

forwardFill(data, ['2024-01-15']); // What happens here?
// Returns: [{ date: '2024-01-15', value: '' }]
```

**Our approach:** Return empty value (null-equivalent) rather than extrapolate. Extrapolation is dangerous and should be explicit.

### Pitfall 3: Performance with Large Date Ranges

**Problem:** Generating years of daily dates creates large arrays.

```typescript
// 10 years of daily data = ~3,650 dates
const tenYears = generateDateRange('2014-01-01', '2024-01-01');
```

**Solutions:**
- Only generate dates you actually need
- Consider weekly or monthly aggregation for long-term analysis
- Cache merged results

---

## Further Learning

### Books

- **"Python for Finance"** by Yves Hilpisch - Comprehensive pandas for trading
- **"Advances in Financial Machine Learning"** by Marcos López de Prado - Advanced time series techniques

### Online Resources

- [pandas Time Series Documentation](https://pandas.pydata.org/docs/user_guide/timeseries.html)
- [FRED API Documentation](https://fred.stlouisfed.org/docs/api/fred/)
- [QuantConnect Time Series Tutorials](https://www.quantconnect.com/tutorials)

### Related Documentation

- [CACHING_IMPLEMENTATION.md](./CACHING_IMPLEMENTATION.md) - How caching reduces API calls
- [API_SECURITY.md](./API_SECURITY.md) - Protecting API keys
- [SIGNALS_API.md](./SIGNALS_API.md) - Trading signals from FRED data

---

## Using the Normalization API

The project exposes the normalization utilities via a REST API endpoint, making it easy to merge FRED series from any client.

### Endpoint: POST /api/normalize

**Request Format:**

```json
{
  "series": [
    { "seriesId": "FEDFUNDS", "key": "fedFunds" },
    { "seriesId": "UNRATE", "key": "unemployment" }
  ],
  "config": {
    "fillMethod": "forward",
    "innerJoin": false
  },
  "dateRange": {
    "start": "2023-01-01",
    "end": "2024-01-01"
  }
}
```

**Response Format:**

```json
{
  "data": [
    { "date": "2023-01-03", "fedFunds": "4.33", "unemployment": "3.5" },
    { "date": "2023-01-04", "fedFunds": "4.33", "unemployment": "3.5" }
  ],
  "seriesInfo": [
    { "key": "fedFunds", "originalFrequency": "daily", "originalCount": 250, "filledCount": 0 },
    { "key": "unemployment", "originalFrequency": "monthly", "originalCount": 12, "filledCount": 238 }
  ],
  "dateRange": { "start": "2023-01-03", "end": "2023-12-29" }
}
```

### JavaScript/TypeScript Client Example

```typescript
async function getNormalizedData() {
  const response = await fetch('/api/normalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      series: [
        { seriesId: 'VIXCLS', key: 'vix' },
        { seriesId: 'UNRATE', key: 'unemployment' },
        { seriesId: 'FEDFUNDS', key: 'fedFunds' },
      ],
      config: { fillMethod: 'forward' },
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result = await response.json();

  // Result contains aligned data for all series
  console.log(`Merged ${result.data.length} data points`);
  console.log(`Date range: ${result.dateRange.start} to ${result.dateRange.end}`);

  // Check how much data was filled
  for (const info of result.seriesInfo) {
    const fillPercent = ((info.filledCount / result.data.length) * 100).toFixed(1);
    console.log(`${info.key}: ${info.originalFrequency}, ${fillPercent}% filled`);
  }

  return result;
}
```

### curl Example

```bash
# Merge VIX (daily) with Unemployment (monthly)
curl -X POST http://localhost:3000/api/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "series": [
      { "seriesId": "VIXCLS", "key": "vix" },
      { "seriesId": "UNRATE", "key": "unemployment" }
    ],
    "config": { "fillMethod": "forward" }
  }' | jq .

# With date range filter
curl -X POST http://localhost:3000/api/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "series": [
      { "seriesId": "FEDFUNDS", "key": "rate" }
    ],
    "config": { "fillMethod": "forward" },
    "dateRange": { "start": "2024-01-01", "end": "2024-06-30" }
  }' | jq .
```

### API Documentation (OPTIONS)

```bash
# Get API documentation
curl -X OPTIONS http://localhost:3000/api/normalize | jq .
```

### Rate Limits

- **20 requests per minute** per IP address
- Normalization is computationally expensive, so rate limits are stricter than raw FRED data

### Error Handling

The API returns structured errors with Zod validation details:

```json
{
  "error": "Invalid request body",
  "details": [
    {
      "path": ["series", 0, "seriesId"],
      "message": "Series ID is required"
    }
  ]
}
```

**Common Error Codes:**
- `400` - Invalid request (validation failed)
- `429` - Rate limit exceeded
- `502` - Failed to fetch FRED data
- `500` - Internal server error

---

## Running Tests

The normalization utilities have comprehensive unit tests:

```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run with coverage
npm test -- --coverage
```

**Test file:** `app/lib/__tests__/dataUtils.test.ts`

The tests also serve as executable documentation, demonstrating:
- Edge cases (empty data, single points)
- The "index-based merge bug" that forward-fill solves
- Real-world scenarios with VIX and unemployment data

---

*Document created: January 2026*
*Project: FRED Economic Indicators Dashboard*
*Source: `app/lib/dataUtils.ts`*
