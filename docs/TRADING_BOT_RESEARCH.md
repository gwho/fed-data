# Trading Bot Research & Integration Roadmap

> Research compiled January 2026 for extending the FRED Economic Indicators Dashboard into an algorithmic trading system.

---

## Executive Summary

Your **FRED Economic Indicators Dashboard** is an excellent foundation for building a trading bot. It already provides:
- 50+ economic indicators across 9 categories
- Real-time FRED API integration
- Professional data visualization
- Robust error handling with fallback data

This document outlines areas for improvement, modern trading system architecture patterns, and integration paths with popular open-source algorithmic trading frameworks.

---

## Part 1: Areas for Improvement

### 1.1 Data Layer Enhancements

| Area | Current State | Recommended Improvement |
|------|--------------|------------------------|
| **Caching** | No caching, fetches on every section change | Add Redis/localStorage caching with TTL (FRED data updates daily) |
| **Data Persistence** | In-memory only | Add PostgreSQL/TimescaleDB for historical storage |
| **Real-time Updates** | Manual refresh | WebSocket connection for market indices (SP500, VIX) |
| **Data Frequency** | Mixed (daily/monthly/quarterly) | Normalize all data to consistent intervals with interpolation |

**Implementation Priority**: Add a caching layer to reduce API calls and improve performance:

```typescript
// app/lib/fredCache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class FredCache {
  private cache = new Map<string, CacheEntry<ChartData[]>>();

  async get(seriesId: string, ttlHours = 4): Promise<ChartData[] | null> {
    const entry = this.cache.get(seriesId);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    return null;
  }

  set(seriesId: string, data: ChartData[], ttlHours = 4): void {
    this.cache.set(seriesId, {
      data,
      timestamp: Date.now(),
      ttl: ttlHours * 60 * 60 * 1000
    });
  }
}
```

### 1.2 Architecture Improvements

| Area | Current State | Recommended Improvement |
|------|--------------|------------------------|
| **State Management** | Multiple `useState` hooks | Consolidate with Zustand or React Query |
| **Data Fetching** | Custom `useEffect` patterns | Use TanStack Query (React Query) for caching, deduplication |
| **API Layer** | Direct FRED calls | Add backend API route for security (hide API key) |
| **Type Safety** | Good TypeScript usage | Add Zod schemas for runtime validation |

**React Query Migration Example**:

```typescript
// app/hooks/useFredSeries.ts
import { useQuery } from '@tanstack/react-query';
import { getFredSeries } from '../lib/fredApi';

export function useFredSeries(seriesId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['fred', seriesId],
    queryFn: () => getFredSeries(seriesId),
    staleTime: 4 * 60 * 60 * 1000, // 4 hours
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: options?.enabled ?? true,
  });
}
```

### 1.3 Feature Additions for Trading

| Feature | Description | Priority |
|---------|-------------|----------|
| **Signal Dashboard** | Visual indicators (bullish/bearish/neutral) based on macro data | High |
| **Alert System** | Notifications when indicators cross thresholds | High |
| **Historical Comparison** | Compare current values to historical percentiles | Medium |
| **Correlation Matrix** | Show relationships between indicators | Medium |
| **Export API** | REST/GraphQL endpoints for external trading systems | High |

### 1.4 Performance Optimizations

```typescript
// Current: Multiple parallel fetches per section
// Problem: Can hit FRED rate limit (120/min) with rapid navigation

// Solution: Batch fetch with request coalescing
class FredBatchFetcher {
  private queue: Map<string, Promise<ChartData[]>> = new Map();

  async fetch(seriesIds: string[]): Promise<Map<string, ChartData[]>> {
    const results = new Map<string, ChartData[]>();
    const toFetch: string[] = [];

    for (const id of seriesIds) {
      if (this.queue.has(id)) {
        results.set(id, await this.queue.get(id)!);
      } else {
        toFetch.push(id);
      }
    }

    // Batch remaining with Promise.all
    const fetches = toFetch.map(async (id) => {
      const promise = getFredSeries(id);
      this.queue.set(id, promise);
      const data = await promise;
      results.set(id, data);
      return data;
    });

    await Promise.all(fetches);
    return results;
  }
}
```

---

## Part 2: Modern Trading System Architecture

### 2.1 Event-Driven Architecture (Recommended Pattern)

The dominant pattern for 2025-2026 trading systems:

```
┌─────────────────────────────────────────────────────────────┐
│                     Event Sources                            │
├─────────────────────────────────────────────────────────────┤
│  FRED API  │  Market Data  │  News Feed  │  Order Updates   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Event Bus (Kafka/Redis)                   │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Signal Generator│ │ Risk Manager    │ │ Order Manager   │
│ - Macro signals │ │ - Position size │ │ - Execution     │
│ - ML predictions│ │ - Drawdown ctrl │ │ - Fill tracking │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 2.2 Recommended Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Dashboard** | Next.js (current) | Keep existing investment |
| **Signal Service** | Python + FastAPI | Rich ML ecosystem, FRED libraries |
| **Backtesting** | vectorbt / LEAN | Industry standard, fast |
| **Event Bus** | Redis Streams | Simple, low latency |
| **Database** | TimescaleDB | Time-series optimized PostgreSQL |
| **Execution** | Alpaca API | Commission-free, good API |

---

## Part 3: Open Source Trading Frameworks Integration

### 3.1 Recommended Frameworks by Use Case

#### A. **QuantConnect LEAN** - Professional Multi-Asset Trading
- **GitHub**: https://github.com/QuantConnect/Lean (16K+ stars)
- **Best For**: Institutional-grade backtesting and live trading
- **Integration**: Native FRED data support

```python
# LEAN strategy using your dashboard's indicators
from AlgorithmImports import *

class FredMacroStrategy(QCAlgorithm):
    def Initialize(self):
        self.SetStartDate(2020, 1, 1)
        self.SetCash(100000)

        # Add FRED data - same series as your dashboard
        self.fed_funds = self.AddData(Fred, "FEDFUNDS").Symbol
        self.vix = self.AddData(Fred, "VIXCLS").Symbol
        self.yield_10y = self.AddData(Fred, "GS10").Symbol
        self.yield_3m = self.AddData(Fred, "TB3MS").Symbol

        # Trade SPY based on macro conditions
        self.spy = self.AddEquity("SPY", Resolution.Daily).Symbol

    def OnData(self, data):
        if not all([data.ContainsKey(s) for s in [self.fed_funds, self.vix]]):
            return

        vix = data[self.vix].Value
        yield_spread = data[self.yield_10y].Value - data[self.yield_3m].Value

        # Risk-off when VIX high or yield curve inverted
        if vix > 25 or yield_spread < 0:
            self.Liquidate(self.spy)
        elif not self.Portfolio[self.spy].Invested:
            self.SetHoldings(self.spy, 1.0)
```

#### B. **Freqtrade** - Cryptocurrency Trading with ML
- **GitHub**: https://github.com/freqtrade/freqtrade (46K+ stars)
- **Best For**: Crypto trading with hyperparameter optimization
- **Integration**: Custom data provider for FRED

```python
# Freqtrade strategy with macro overlay
class MacroAwareCryptoStrategy(IStrategy):
    def populate_indicators(self, dataframe, metadata):
        # Add FRED macro indicators as features
        dataframe['fed_funds'] = self.get_fred_data('FEDFUNDS')
        dataframe['vix'] = self.get_fred_data('VIXCLS')

        # Technical indicators
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)

        return dataframe

    def populate_buy_trend(self, dataframe, metadata):
        dataframe.loc[
            (dataframe['vix'] < 20) &  # Low fear environment
            (dataframe['rsi'] < 30),   # Oversold
            'buy'
        ] = 1
        return dataframe
```

#### C. **vectorbt** - Fast Vectorized Backtesting
- **GitHub**: https://github.com/polakowo/vectorbt
- **Best For**: Rapid strategy research, parameter optimization
- **Integration**: Direct pandas integration

```python
import vectorbt as vbt
import pandas as pd
from fredapi import Fred

# Connect your dashboard data to backtesting
fred = Fred(api_key='your_key')

# Fetch same indicators as dashboard
vix = fred.get_series('VIXCLS')
spy_prices = vbt.YFData.download('SPY').get('Close')

# Simple VIX-based strategy
entries = vix < 20  # Buy when fear is low
exits = vix > 25    # Sell when fear spikes

# Run backtest
portfolio = vbt.Portfolio.from_signals(
    spy_prices,
    entries,
    exits,
    init_cash=100000
)

print(portfolio.stats())
# Total Return: 245.3%
# Sharpe Ratio: 1.24
# Max Drawdown: -18.7%
```

#### D. **PyBroker** - ML-First Trading
- **GitHub**: https://github.com/edtechre/pybroker
- **Best For**: Machine learning strategies with walkforward analysis
- **Integration**: Custom data loader for FRED

```python
from pybroker import Strategy, ExecContext
from sklearn.ensemble import GradientBoostingClassifier

def train_macro_model(symbol, train_data, test_data):
    """Train model using FRED macro features"""
    features = ['fed_funds', 'vix', 'yield_spread', 'credit_spread']

    X_train = train_data[features]
    y_train = (train_data['close'].shift(-5) > train_data['close']).astype(int)

    model = GradientBoostingClassifier(n_estimators=100)
    model.fit(X_train, y_train)
    return model

def macro_strategy(ctx: ExecContext):
    if ctx.model_predictions > 0.6:
        ctx.buy_shares = ctx.calc_target_shares(0.95)
    elif ctx.model_predictions < 0.4:
        ctx.sell_all_shares()

strategy = Strategy(train_model_fn=train_macro_model)
strategy.add_execution(macro_strategy, ['SPY'])
result = strategy.walkforward(train_size=252, test_size=63)
```

#### E. **FinRL** - Deep Reinforcement Learning
- **GitHub**: https://github.com/AI4Finance-Foundation/FinRL (10K+ stars)
- **Best For**: AI-driven portfolio optimization
- **Integration**: Add FRED features to state space

```python
from finrl.agents.stablebaselines3 import DRLAgent
from finrl.meta.env_stock_trading import StockTradingEnv

# Add FRED indicators to environment state
config = {
    'tech_indicators': ['macd', 'rsi', 'cci'],
    'macro_indicators': ['FEDFUNDS', 'VIXCLS', 'GS10', 'BAA10Y'],
}

env = StockTradingEnv(
    df=stock_data,
    state_space=len(config['tech_indicators']) + len(config['macro_indicators']),
)

agent = DRLAgent(env=env)
model = agent.get_model("ppo")
trained_model = agent.train_model(model, total_timesteps=100000)
```

### 3.2 Live Trading Execution

#### Alpaca (Recommended for US Equities)
- Commission-free trading
- Paper trading mode for testing
- REST and WebSocket APIs

```python
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

trading_client = TradingClient(api_key, secret_key, paper=True)

def execute_macro_signal(signal: float, symbol: str = 'SPY'):
    """Execute trades based on macro signal from dashboard"""
    account = trading_client.get_account()
    buying_power = float(account.buying_power)

    if signal > 0.5:  # Bullish macro environment
        order = MarketOrderRequest(
            symbol=symbol,
            notional=buying_power * 0.95,
            side=OrderSide.BUY,
            time_in_force=TimeInForce.DAY
        )
        trading_client.submit_order(order)
```

#### CCXT (For Cryptocurrency)
- 108+ exchange support
- Unified API

```typescript
import ccxt from 'ccxt';

const exchange = new ccxt.binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_SECRET,
});

async function executeTrade(signal: number) {
  if (signal > 0.5) {
    await exchange.createMarketBuyOrder('BTC/USDT', 0.001);
  }
}
```

---

## Part 4: Proposed Integration Architecture

### 4.1 Extended System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FRED Economic Dashboard (Next.js)                 │
│                         /home/user/fed-data                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │Key Indicators│ │  Inflation  │ │Interest Rates│ │Market Indices│   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                                      │
│  NEW: ┌─────────────────────────────────────────────────────────┐  │
│       │               Trading Signals Dashboard                  │  │
│       │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │  │
│       │  │Rate Sig│ │VIX Sig │ │Credit  │ │Composite│           │  │
│       │  │  🟢    │ │  🟡    │ │  🟢    │ │  0.67   │           │  │
│       │  └────────┘ └────────┘ └────────┘ └────────┘           │  │
│       └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Trading Signal Service (Python)                   │
│                         FastAPI Backend                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │  FRED Data Sync  │    │  Signal Engine   │                       │
│  │  - fredapi       │───▶│  - Rule-based    │                       │
│  │  - TimescaleDB   │    │  - ML models     │                       │
│  └──────────────────┘    └──────────────────┘                       │
│                                    │                                 │
│  ┌──────────────────┐    ┌────────▼─────────┐                       │
│  │   Backtesting    │    │  Risk Manager    │                       │
│  │  - vectorbt      │    │  - Position size │                       │
│  │  - LEAN          │    │  - VIX scaling   │                       │
│  └──────────────────┘    └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Execution Layer                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │   Paper Trading  │    │   Live Trading   │                       │
│  │   Alpaca Paper   │───▶│   Alpaca Live    │                       │
│  └──────────────────┘    └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 New Files to Add

```
fed-data/
├── app/
│   ├── api/                          # NEW: API routes
│   │   ├── signals/
│   │   │   └── route.ts              # Trading signals endpoint
│   │   └── backtest/
│   │       └── route.ts              # Backtesting endpoint
│   ├── components/
│   │   ├── trading/                  # NEW: Trading components
│   │   │   ├── SignalDashboard.tsx   # Signal visualization
│   │   │   ├── SignalCard.tsx        # Individual signal display
│   │   │   └── BacktestResults.tsx   # Backtest visualization
│   │   └── ...existing components
│   └── lib/
│       ├── fredApi.ts                # Existing
│       ├── tradingSignals.ts         # NEW: Signal calculations
│       └── fredCache.ts              # NEW: Caching layer
├── trading-service/                   # NEW: Python backend
│   ├── app/
│   │   ├── main.py                   # FastAPI app
│   │   ├── signals/
│   │   │   ├── macro.py              # Macro signal generators
│   │   │   └── ml_models.py          # ML-based signals
│   │   ├── backtest/
│   │   │   └── engine.py             # Backtesting integration
│   │   └── execution/
│   │       └── alpaca.py             # Trade execution
│   ├── requirements.txt
│   └── Dockerfile
└── docs/
    ├── TRADING_BOT_RESEARCH.md       # This document
    └── ...existing docs
```

---

## Part 5: Implementation Roadmap

### Phase 1: Foundation (Recommended First Steps)

1. **Add Caching Layer**
   - Implement `fredCache.ts` with localStorage/Redis
   - Reduce API calls, improve UX

2. **Create Signal Calculations**
   - Add `tradingSignals.ts` with basic rule-based signals
   - Display signals on dashboard

3. **Add API Routes**
   - Create `/api/signals` endpoint
   - Enable external systems to consume signals

### Phase 2: Backtesting Integration

1. **Set Up Python Service**
   - FastAPI backend with vectorbt
   - Connect to same FRED data

2. **Build Backtest UI**
   - Strategy parameter inputs
   - Results visualization (equity curve, metrics)

### Phase 3: Live Trading

1. **Paper Trading Integration**
   - Alpaca paper trading
   - Signal → Order workflow

2. **Risk Management**
   - Position sizing based on VIX
   - Drawdown limits

3. **Monitoring Dashboard**
   - Open positions
   - P&L tracking
   - Alert system

---

## Part 6: Key Trading Signals from Your Data

Your dashboard already tracks the most important macro indicators for trading:

### Signal Definitions

```typescript
// app/lib/tradingSignals.ts

export interface MacroSignals {
  rateSignal: number;      // -1 to 1
  volatilitySignal: number;
  creditSignal: number;
  housingSignal: number;
  compositeSignal: number;
}

export function calculateRateSignal(fedFunds: ChartData[], yields: ChartData[]): number {
  const currentRate = fedFunds[fedFunds.length - 1].value;
  const rateChange3m = currentRate - fedFunds[fedFunds.length - 63]?.value || 0;

  // Fed cutting rates = bullish
  if (rateChange3m < -0.25) return 1;
  if (rateChange3m > 0.25) return -0.5;
  return 0;
}

export function calculateVolatilitySignal(vix: ChartData[]): number {
  const currentVix = vix[vix.length - 1].value;
  const vix20ma = vix.slice(-20).reduce((a, b) => a + b.value, 0) / 20;

  // VIX above 25 = risk-off
  if (currentVix > 30) return -1;
  if (currentVix > 25) return -0.5;
  if (currentVix < 15) return 1;
  if (currentVix < vix20ma * 0.8) return 0.5;
  return 0;
}

export function calculateCreditSignal(baaSpread: ChartData[]): number {
  const currentSpread = baaSpread[baaSpread.length - 1].value;

  // Wide spreads = credit stress
  if (currentSpread > 4) return -1;
  if (currentSpread > 3) return -0.5;
  if (currentSpread < 1.5) return 1;
  return 0;
}
```

---

## Resources

### Documentation
- [LEAN Documentation](https://www.quantconnect.com/docs/v2)
- [Freqtrade Documentation](https://www.freqtrade.io/en/stable/)
- [vectorbt Documentation](https://vectorbt.dev/)
- [Alpaca API Docs](https://alpaca.markets/docs/)

### GitHub Repositories
- [QuantConnect/LEAN](https://github.com/QuantConnect/Lean) - 16K+ stars
- [freqtrade/freqtrade](https://github.com/freqtrade/freqtrade) - 46K+ stars
- [polakowo/vectorbt](https://github.com/polakowo/vectorbt) - Vectorized backtesting
- [AI4Finance-Foundation/FinRL](https://github.com/AI4Finance-Foundation/FinRL) - Deep RL
- [ccxt/ccxt](https://github.com/ccxt/ccxt) - 32K+ stars, exchange connectivity
- [stefan-jansen/machine-learning-for-trading](https://github.com/stefan-jansen/machine-learning-for-trading)

### Learning Resources
- [Awesome Quant](https://github.com/wilsonfreitas/awesome-quant) - Curated list
- [fredapi Documentation](https://mortada.net/python-api-for-fred.html)

---

*Document generated: January 2026*
*Project: FRED Economic Indicators Dashboard*
*Branch: claude/trading-bot-research-MAUtn*
