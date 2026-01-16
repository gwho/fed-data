# FRED Dashboard Architecture

## Data Flow Overview

This document explains how economic data flows from the Federal Reserve Economic Data (FRED) API to the interactive charts displayed in the dashboard.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                              │
│                         (Next.js App Router)                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SIDEBAR NAVIGATION                          │
│                       (components/Sidebar.tsx)                       │
│                                                                       │
│  [Key Indicators] [Inflation] [Employment] [Interest Rates]         │
│  [Economic Growth] [Exchange Rates] [Housing] [Consumer Spending]   │
│  [Market Indices]                                                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ User clicks section
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        MAIN PAGE COMPONENT                           │
│                           (app/page.tsx)                             │
│                                                                       │
│  State Management:                                                   │
│  • activeSection (which tab is selected)                             │
│  • Chart data states (cpiData, gdpData, vixData, etc.)              │
│  • Loading states (loading, inflationLoading, etc.)                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ useEffect triggers on section change
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA LOADING FUNCTIONS                          │
│                                                                       │
│  • loadData() - Key Indicators (runs on mount)                      │
│  • loadInflationData() - Inflation section                          │
│  • loadEmploymentData() - Employment section                        │
│  • loadEconomicGrowthData() - Economic Growth section               │
│  • loadExchangeRatesData() - Exchange Rates section                 │
│  • loadMarketIndicesData() - Market Indices section                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Parallel API calls with Promise.all()
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FRED API LAYER                                │
│                       (lib/fredApi.ts)                               │
│                                                                       │
│  getFredSeries(seriesId, startDate)                                 │
│    │                                                                 │
│    ├─► Try: Fetch from FRED API                                     │
│    │   https://api.stlouisfed.org/fred/series/observations          │
│    │                                                                 │
│    └─► Catch: Fallback to getSampleData()                           │
│        • Returns mock data for development                          │
│        • Ensures charts always display                              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Return array of {date, value}
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA TRANSFORMATION                             │
│                                                                       │
│  Format raw FRED data:                                               │
│  • Parse date strings → Date objects                                 │
│  • Format dates for display (toLocaleDateString)                    │
│  • Parse value strings → Numbers (parseFloat)                       │
│  • Merge multiple series for multi-line charts                      │
│                                                                       │
│  Example:                                                            │
│  { date: "2024-01-01", value: "5881.63" }                           │
│          ↓                                                           │
│  { date: "Jan", value: 5881.63 }                                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Update state with formatted data
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         STATE UPDATES                                │
│                                                                       │
│  setGdpData(formattedData)                                          │
│  setSp500Data(formattedData)                                        │
│  setVixData(formattedData)                                          │
│  etc...                                                              │
│                                                                       │
│  setLoading(false) - Hide loading spinner                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ React re-renders with new data
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CHART COMPONENTS                                │
│                        (Recharts Library)                            │
│                                                                       │
│  ChartCard (wrapper)                                                 │
│    └─► ResponsiveContainer                                          │
│          └─► LineChart                                              │
│                ├─► CartesianGrid (background grid)                  │
│                ├─► XAxis (dates)                                    │
│                ├─► YAxis (values)                                   │
│                ├─► Tooltip (hover info)                             │
│                ├─► Legend (series labels)                           │
│                ├─► ReferenceLine (threshold markers)                │
│                └─► Line (data visualization)                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Render to browser
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      USER SEES CHART                                 │
│                                                                       │
│  Interactive features:                                               │
│  • Hover tooltips showing exact values                              │
│  • Legend showing series names                                      │
│  • Reference lines marking important thresholds                     │
│  • Responsive design adapting to screen size                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Detailed Component Flow

### 1. User Interaction
```
User clicks "Economic Growth" in sidebar
    ↓
Sidebar.tsx calls onSectionChange('economic-growth')
    ↓
page.tsx updates activeSection state
```

### 2. Data Fetching Trigger
```
useEffect hook detects activeSection change
    ↓
If activeSection === 'economic-growth':
    loadEconomicGrowthData() executes
```

### 3. Parallel API Calls
```javascript
const [realGdp, nominalGdp, industrialProd, retailSales, capacityUtil] =
  await Promise.all([
    getFredSeries('A191RL1Q225SBEA', twoYearsAgoStr),  // Real GDP
    getFredSeries('A191RP1Q027SBEA', twoYearsAgoStr),  // Nominal GDP
    getFredSeries('INDPRO', oneYearAgoStr),             // Industrial Production
    getFredSeries('RSAFS', oneYearAgoStr),              // Retail Sales
    getFredSeries('TCU', oneYearAgoStr),                // Capacity Utilization
  ]);
```

### 4. FRED API Request Flow
```
getFredSeries('A191RL1Q225SBEA', '2022-01-16')
    ↓
Try: Fetch from FRED API
    URL: https://api.stlouisfed.org/fred/series/observations
    Params: ?series_id=A191RL1Q225SBEA&observation_start=2022-01-16
    ↓
Success: Return API response
    OR
Error: Return getSampleData('A191RL1Q225SBEA')
```

### 5. Data Transformation
```javascript
// Raw FRED data
[
  { date: "2024-01-01", value: "3.1" },
  { date: "2024-03-01", value: "3.0" },
]

// Transform to chart-ready format
realGdp.map((d) => ({
  date: new Date(d.date).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit'
  }),
  value: parseFloat(d.value),
}))

// Result
[
  { date: "Jan 24", value: 3.1 },
  { date: "Mar 24", value: 3.0 },
]
```

### 6. State Update & Render
```javascript
setRealGdpData(formattedData);
    ↓
React detects state change
    ↓
Re-render LineChart component with new data
    ↓
Recharts renders SVG elements on canvas
```

## Key Technical Patterns

### 1. Lazy Loading by Section
Data is only fetched when a section becomes active:
```javascript
useEffect(() => {
  if (activeSection === 'economic-growth') {
    loadEconomicGrowthData();
  }
}, [activeSection]);
```

**Benefits:**
- Faster initial page load
- Reduced API calls
- Better performance

### 2. Graceful Fallback
API errors don't break the UI:
```javascript
try {
  const data = await fetch(fredApiUrl);
  return data;
} catch (error) {
  console.error('Error:', error);
  return getSampleData(seriesId); // Always show something
}
```

### 3. Parallel Data Fetching
Multiple series load simultaneously:
```javascript
await Promise.all([
  getFredSeries('SP500', startDate),
  getFredSeries('NASDAQCOM', startDate),
  getFredSeries('DJIA', startDate),
]);
```

### 4. Data Merging for Multi-Line Charts
Combine series with different data points:
```javascript
function mergeSeriesByDate(series) {
  const allDates = [...new Set(
    series.flatMap(s => s.data.map(d => d.date))
  )].sort();

  return allDates.map(date => {
    const point = { date };
    series.forEach(s => {
      const value = s.data.find(d => d.date === date)?.value;
      point[s.key] = value || null;
    });
    return point;
  });
}
```

## FRED Series Examples

### Key Indicators
- `CPIAUCSL` - Consumer Price Index
- `UNRATE` - Unemployment Rate
- `A191RL1Q225SBEA` - Real GDP Growth Rate
- `SP500` - S&P 500 Stock Market Index

### Market Indices
- `VIXCLS` - CBOE Volatility Index (VIX)
- `BAA10Y` - Baa Corporate Bond Spread
- `AAA10Y` - Aaa Corporate Bond Spread
- `NASDAQCOM` - Nasdaq Composite
- `DJIA` - Dow Jones Industrial Average

### Exchange Rates
- `DTWEXBGS` - Trade-Weighted Dollar Index
- `DEXUSEU` - EUR/USD
- `DEXUSUK` - GBP/USD
- `DEXJPUS` - JPY/USD

### Interest Rates
- `GS10` - 10-Year Treasury Constant Maturity Rate
- `TB3MS` - 3-Month Treasury Bill Rate

## Component Structure

```
app/
├── page.tsx                          # Main dashboard page
│   ├── State management
│   ├── Data loading functions
│   └── Section rendering logic
│
├── components/
│   ├── Sidebar.tsx                   # Navigation sidebar
│   └── interest-rates/
│       └── InterestRatesSection.tsx  # Dedicated section component
│
└── lib/
    └── fredApi.ts                    # FRED API integration
        ├── getFredSeries()           # Fetch data from FRED
        └── getSampleData()           # Fallback sample data
```

## Data Flow Timeline

```
Time 0ms:    User clicks "Market Indices"
Time 10ms:   activeSection state updates
Time 15ms:   useEffect detects change
Time 20ms:   loadMarketIndicesData() starts
Time 25ms:   7 parallel API calls begin
Time 30ms:   Loading spinner shows
Time 500ms:  API calls return (or fallback to sample data)
Time 510ms:  Data transformation begins
Time 520ms:  State updates with formatted data
Time 525ms:  React re-renders components
Time 530ms:  Recharts generates SVG elements
Time 550ms:  Charts visible to user
```

## Error Handling Strategy

### 1. Network Errors
```javascript
catch (error) {
  console.error('Error fetching FRED data:', error);
  return getSampleData(seriesId); // Use mock data
}
```

### 2. Invalid Data
```javascript
const value = parseFloat(d.value);
if (isNaN(value)) return null; // Skip invalid points
```

### 3. Empty Datasets
```jsx
{data.length > 0 ? (
  <LineChart data={data}>...</LineChart>
) : (
  <div>No data available</div>
)}
```

## Performance Optimizations

1. **Lazy Loading**: Data fetched only when section is active
2. **Memoization**: Formatted data cached to prevent re-computation
3. **Parallel Requests**: Multiple series loaded simultaneously
4. **Sample Data Fallback**: Charts always display, even offline
5. **Responsive Container**: Charts adapt to screen size automatically

## Future Enhancements

- [ ] Add date range selector (3M, 6M, 1Y, 5Y, ALL)
- [ ] Implement data caching with localStorage
- [ ] Add export to CSV/PNG functionality
- [ ] Create shared custom tooltip component
- [ ] Implement gradient fills under lines
- [ ] Add smooth animations on chart load
- [ ] Enable clickable legend toggling
- [ ] Add comparison mode (overlay multiple periods)

## Technology Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts (built on D3.js)
- **Data Source**: Federal Reserve Economic Data (FRED) API
- **Deployment**: Vercel (recommended)

## API Rate Limits

FRED API has the following limits:
- **Free Tier**: 120 requests/minute
- **API Key Required**: Yes (set in `.env.local`)
- **Cache Strategy**: Sample data fallback prevents rate limit issues

## Development vs Production

### Development Mode
- Uses sample data fallback when API fails
- Console logs for debugging
- Hot module reloading

### Production Mode
- Requires valid FRED API key
- Error logging to monitoring service
- Optimized bundle with tree shaking
