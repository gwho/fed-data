# Trading Signals API Documentation

> REST API for accessing trading signals derived from FRED economic indicators.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [API Reference](#api-reference)
4. [Signal Definitions](#signal-definitions)
5. [Response Format](#response-format)
6. [Integration Guide](#integration-guide)
7. [Further Learning](#further-learning)

---

## Overview

The Trading Signals API calculates macro-economic trading signals from Federal Reserve Economic Data (FRED). These signals can help inform investment decisions by providing a quantitative assessment of the current economic environment.

### Key Features

- **5 Trading Signals**: Rate, Volatility, Credit, Housing, and Composite
- **Real-time Calculation**: Signals are calculated on-demand from cached FRED data
- **RESTful Design**: Simple GET requests with optional filtering
- **Detailed Explanations**: Each signal includes human-readable reasoning

### Signal Range

All signals are normalized to a **-1 to +1 scale**:

| Value | Interpretation | Recommended Action |
|-------|----------------|-------------------|
| `+1.0` | Strong bullish | Risk-on, increase exposure |
| `+0.5` | Moderate bullish | Cautiously bullish |
| `0.0` | Neutral | Hold current positions |
| `-0.5` | Moderate bearish | Cautiously bearish |
| `-1.0` | Strong bearish | Risk-off, reduce exposure |

---

## Quick Start

### Get All Signals

```bash
curl http://localhost:3000/api/signals
```

### Get Specific Signal

```bash
curl http://localhost:3000/api/signals?type=rate
```

### Get Multiple Signals

```bash
curl http://localhost:3000/api/signals?type=rate,volatility,credit
```

### JavaScript Example

```javascript
// Fetch all signals
const response = await fetch('/api/signals');
const data = await response.json();

console.log('Composite Signal:', data.signals.composite.value);
console.log('Interpretation:', data.signals.composite.interpretation);
console.log('Explanation:', data.signals.composite.explanation);
```

### Python Example

```python
import requests

# Fetch all signals
response = requests.get('http://localhost:3000/api/signals')
data = response.json()

composite = data['signals']['composite']
print(f"Signal: {composite['value']} ({composite['interpretation']})")
print(f"Reason: {composite['explanation']}")
```

---

## API Reference

### GET /api/signals

Returns trading signals calculated from FRED economic data.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Comma-separated list of signal types |

#### Valid Signal Types

- `rate` - Interest rate signal
- `volatility` - VIX-based volatility signal
- `credit` - Corporate bond spread signal
- `housing` - Housing market signal
- `composite` - Weighted average of all signals

#### Response Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `400` | Invalid signal type |
| `500` | Server error |

#### Example Request

```http
GET /api/signals?type=rate,volatility HTTP/1.1
Host: localhost:3000
```

#### Example Response

```json
{
  "signals": {
    "rate": {
      "name": "Interest Rate Signal",
      "value": 0.5,
      "interpretation": "bullish",
      "confidence": 0.85,
      "explanation": "Fed Funds rate decreased 0.50% over 3 months...",
      "indicators": {
        "fedFundsRate": 4.33,
        "fedFundsChange3m": -0.5,
        "yieldCurveSlope": 0.26
      },
      "updatedAt": "2026-01-21T12:00:00.000Z"
    },
    "volatility": {
      "name": "Volatility Signal",
      "value": 0.2,
      "interpretation": "neutral",
      "confidence": 0.8,
      "explanation": "VIX at 15.3 indicates normal market conditions...",
      "indicators": {
        "vixCurrent": 15.3,
        "vix20dayMA": 16.1
      },
      "updatedAt": "2026-01-21T12:00:00.000Z"
    }
  },
  "meta": {
    "calculatedAt": "2026-01-21T12:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### OPTIONS /api/signals

Returns API metadata and documentation.

---

## Signal Definitions

### 1. Interest Rate Signal (`rate`)

**Purpose**: Assess monetary policy stance and yield curve health.

**FRED Series Used**:
- `FEDFUNDS` - Federal Funds Effective Rate
- `GS10` - 10-Year Treasury Yield
- `TB3MS` - 3-Month Treasury Yield

**Calculation Logic**:

```
Rate Change Signal (60% weight):
- Fed Funds decreased ≥0.5% in 3 months → +1.0 (bullish)
- Fed Funds decreased ≥0.25% in 3 months → +0.5
- Fed Funds increased ≥0.5% in 3 months → -1.0 (bearish)
- Fed Funds increased ≥0.25% in 3 months → -0.5

Yield Curve Signal (40% weight):
- 10Y - 3M < -0.5% (deeply inverted) → -1.0 (bearish)
- 10Y - 3M < 0% (inverted) → -0.5
- 10Y - 3M > 1.5% (steep) → +0.5

Final Signal = 0.6 × Rate Change + 0.4 × Yield Curve
```

**Interpretation**:
- **Bullish**: Fed cutting rates, steep yield curve
- **Bearish**: Fed hiking rates, inverted yield curve

---

### 2. Volatility Signal (`volatility`)

**Purpose**: Measure market fear/complacency using VIX.

**FRED Series Used**:
- `VIXCLS` - CBOE Volatility Index

**Calculation Logic**:

```
VIX Level Thresholds:
- VIX > 35 → -1.0 (extreme fear)
- VIX > 25 → -0.6 (elevated fear)
- VIX > 20 → -0.3 (above average)
- VIX < 12 → +0.5 (low fear, watch for complacency)
- VIX < 15 → +0.7 (favorable)
- VIX 15-20 → +0.2 (normal)

Adjustment vs 20-day MA:
- VIX rising >20% vs MA → subtract 0.2
- VIX falling >20% vs MA → add 0.2
```

**Interpretation**:
- **Bullish**: Low VIX, declining volatility
- **Bearish**: High VIX, spiking volatility

---

### 3. Credit Signal (`credit`)

**Purpose**: Assess financial stress via corporate bond spreads.

**FRED Series Used**:
- `BAA10Y` - Moody's Baa Corporate Bond Yield Spread over 10Y Treasury
- `AAA10Y` - Moody's Aaa Corporate Bond Yield Spread over 10Y Treasury

**Calculation Logic**:

```
Baa Spread Level:
- Spread > 4% → -0.8 (significant stress)
- Spread > 3% → -0.4 (elevated risk)
- Spread < 1.5% → +0.6 (strong risk appetite)
- Spread < 2% → +0.3 (healthy)

Spread Change Adjustment (3 months):
- Widening > 0.5% → subtract 0.3
- Tightening > 0.5% → add 0.3
```

**Interpretation**:
- **Bullish**: Tight spreads, strong risk appetite
- **Bearish**: Wide/widening spreads, credit stress

---

### 4. Housing Signal (`housing`)

**Purpose**: Gauge economic health through housing market.

**FRED Series Used**:
- `CSUSHPISA` - S&P/Case-Shiller U.S. National Home Price Index
- `HOUST` - Housing Starts

**Calculation Logic**:

```
Home Price YoY Change (60% weight):
- YoY > 10% → +0.5 (strong)
- YoY > 5% → +0.3 (healthy)
- YoY < -5% → -0.6 (weakness)
- YoY < 0% → -0.3 (cooling)

Housing Starts Change (40% weight):
- 3-month change > 10% → +0.4
- 3-month change < -10% → -0.4
```

**Interpretation**:
- **Bullish**: Rising prices, increasing construction
- **Bearish**: Falling prices, declining starts

---

### 5. Composite Signal (`composite`)

**Purpose**: Weighted average providing overall macro assessment.

**Component Weights**:
- Rate Signal: **30%** (monetary policy is primary driver)
- Volatility Signal: **25%** (market sentiment)
- Credit Signal: **25%** (financial conditions)
- Housing Signal: **20%** (economic health)

**Formula**:
```
Composite = 0.30×Rate + 0.25×Volatility + 0.25×Credit + 0.20×Housing
```

---

## Response Format

### SignalResult Object

```typescript
interface SignalResult {
  name: string;           // Human-readable signal name
  value: number;          // Signal value (-1 to +1)
  interpretation: string; // "strong_bearish" | "bearish" | "neutral" | "bullish" | "strong_bullish"
  confidence: number;     // Confidence level (0 to 1)
  explanation: string;    // Human-readable explanation
  indicators: {           // Raw indicator values used
    [key: string]: number | null;
  };
  updatedAt: string;      // ISO timestamp
}
```

### Full Response Object

```typescript
interface SignalsResponse {
  signals: {
    rate: SignalResult;
    volatility: SignalResult;
    credit: SignalResult;
    housing: SignalResult;
    composite: SignalResult;
  };
  meta: {
    calculatedAt: string; // When signals were calculated
    version: string;      // API version
  };
}
```

---

## Integration Guide

### For Trading Bots

```python
# Example: Simple signal-based position sizing
import requests

def get_position_size(base_size: float) -> float:
    """Adjust position size based on composite signal."""
    response = requests.get('http://localhost:3000/api/signals?type=composite')
    data = response.json()

    signal = data['signals']['composite']['value']
    confidence = data['signals']['composite']['confidence']

    # Scale position based on signal and confidence
    # signal > 0 = increase size, signal < 0 = decrease size
    multiplier = 1 + (signal * confidence * 0.5)  # Max ±50% adjustment

    return base_size * max(0.5, min(1.5, multiplier))
```

### For Dashboards

```javascript
// React component example
function SignalDashboard() {
  const [signals, setSignals] = useState(null);

  useEffect(() => {
    fetch('/api/signals')
      .then(res => res.json())
      .then(data => setSignals(data.signals));
  }, []);

  if (!signals) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-5 gap-4">
      {Object.entries(signals).map(([key, signal]) => (
        <SignalCard key={key} signal={signal} />
      ))}
    </div>
  );
}
```

### With QuantConnect LEAN

```python
# Use signals in LEAN algorithm
from AlgorithmImports import *
import requests

class MacroSignalAlgorithm(QCAlgorithm):
    def Initialize(self):
        self.SetStartDate(2024, 1, 1)
        self.SetCash(100000)
        self.spy = self.AddEquity("SPY").Symbol
        self.Schedule.On(
            self.DateRules.EveryDay(),
            self.TimeRules.AfterMarketOpen("SPY", 30),
            self.CheckSignals
        )

    def CheckSignals(self):
        response = requests.get('http://your-dashboard/api/signals?type=composite')
        data = response.json()
        signal = data['signals']['composite']['value']

        if signal > 0.3:
            self.SetHoldings(self.spy, 1.0)
        elif signal < -0.3:
            self.Liquidate(self.spy)
```

---

## Further Learning

### Economic Indicators

- **[FRED Documentation](https://fred.stlouisfed.org/docs/api/fred/)** - Official FRED API docs
- **[Federal Reserve Economic Data](https://fred.stlouisfed.org/)** - Browse all available series
- **[Investopedia: Leading Economic Indicators](https://www.investopedia.com/terms/l/leadingindicator.asp)**

### Trading Systems

- **[QuantConnect Documentation](https://www.quantconnect.com/docs/)** - Algorithmic trading platform
- **[Alpaca API Docs](https://alpaca.markets/docs/)** - Commission-free trading API
- **[Freqtrade Documentation](https://www.freqtrade.io/)** - Crypto trading bot

### Signal Processing

- **[Investopedia: VIX](https://www.investopedia.com/terms/v/vix.asp)** - Understanding the fear index
- **[Yield Curve Analysis](https://www.investopedia.com/terms/y/yieldcurve.asp)** - Interpreting yield curves
- **[Credit Spreads Explained](https://www.investopedia.com/terms/c/creditspread.asp)** - Corporate bond analysis

### Building APIs

- **[Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)** - API routes in Next.js
- **[REST API Best Practices](https://restfulapi.net/)** - API design principles

---

## Changelog

### v1.0.0 (January 2026)

- Initial release
- 5 trading signals: rate, volatility, credit, housing, composite
- RESTful API with optional filtering
- Comprehensive documentation

---

*Document created: January 2026*
*API Version: 1.0.0*
