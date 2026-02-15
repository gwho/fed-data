/**
 * Page integration tests — smoke tests + error state
 *
 * These tests replace the two manual checklist items from the Phase 2.6 PR:
 *   - "Browser smoke test: all 8 dashboard sections render correctly"
 *   - "Error state: block api.stlouisfed.org → 'Failed to load data' shown"
 *
 * Strategy: mock all 8 domain hooks at module level; mutate per-test state
 * objects to simulate success / error / loading conditions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChartData, MergedDataPoint } from '../utils/chartHelpers';
import Home from '../page';

// ---------------------------------------------------------------------------
// Minimal mock data — empty arrays keep charts renderable without API calls
// ---------------------------------------------------------------------------

const E: ChartData[] = [];
const M: MergedDataPoint[] = [];

// Per-hook state objects.  The vi.mock factory closes over these by reference,
// so mutating .error / .loading in a test takes effect without re-mocking.
const state = {
  keyIndicators: {
    loading: false,
    error: null as Error | null,
    data: {
      cpi: E, unemployment: E, tenYear: E, threeMonth: E,
      fedFunds: E, mortgage: E, gdp: E, sp500: E,
    },
  },
  inflation: {
    loading: false,
    error: null as Error | null,
    data: {
      coreCpi: E, pce: E, corePce: E, foodCpi: E,
      energyCpi: E, housingCpi: E, medicalCpi: E,
    },
  },
  employment: {
    loading: false,
    error: null as Error | null,
    data: { laborForce: E, payrolls: E, initialClaims: E, hourlyEarnings: E },
  },
  economicGrowth: {
    loading: false,
    error: null as Error | null,
    data: { realGdp: E, nominalGdp: E, industrialProd: E, retailSales: E, capacityUtil: E },
  },
  housing: {
    loading: false,
    error: null as Error | null,
    data: {
      homePrice: E, housingStarts: E, buildingPermits: E, mortgageRate: E,
      affordability: E, newHomeSales: E, existingHomeSales: E,
    },
  },
  exchangeRates: {
    loading: false,
    error: null as Error | null,
    data: { dollarIndex: E, eur: E, gbp: E, jpy: E, cny: E, mxn: E, inr: E, cad: E, aud: E },
  },
  consumerSpending: {
    loading: false,
    error: null as Error | null,
    data: { pceChart: M, retailChart: M, savingsChart: M, sentimentChart: M },
  },
  marketIndices: {
    loading: false,
    error: null as Error | null,
    data: { equityIndices: M, vix: E, creditSpread: M, breadth: M },
  },
};

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that use them
// ---------------------------------------------------------------------------

vi.mock('@/app/hooks', () => ({
  useKeyIndicatorsData:    () => state.keyIndicators,
  useInflationData:        () => state.inflation,
  useEmploymentData:       () => state.employment,
  useEconomicGrowthData:   () => state.economicGrowth,
  useHousingData:          () => state.housing,
  useExchangeRatesData:    () => state.exchangeRates,
  useConsumerSpendingData: () => state.consumerSpending,
  useMarketIndicesData:    () => state.marketIndices,
}));

// Prevent TradingSignalsSection's internal useEffect from hitting real network
vi.mock('@/app/lib/fredApi');

// ---------------------------------------------------------------------------
// Reset state before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(state).forEach((s) => {
    s.error = null;
    s.loading = false;
  });
});

// ---------------------------------------------------------------------------
// Smoke tests — every section renders at least one expected title
// ---------------------------------------------------------------------------

describe('Home page — smoke tests', () => {
  it('renders key-indicators section by default (no navigation)', () => {
    render(<Home />);
    expect(screen.getByText('CPI - last three years')).toBeDefined();
  });

  it.each([
    ['Inflation',        'Headline vs Core CPI'],
    ['Employment',       'Total Nonfarm Payrolls'],
    ['Interest Rates',   'Federal Funds Effective Rate'],
    ['Economic Growth',  'Real vs Nominal GDP Growth Rate'],
    ['Exchange Rates',   'Trade-Weighted U.S. Dollar Index (Broad)'],
    ['Housing',          'S&P/Case-Shiller U.S. National Home Price Index'],
    ['Consumer Spending','Personal Consumption Expenditures by Category'],
    ['Market Indices',   'Equity Index Levels'],
    ['Trading Signals',  'Trading Signals'],
  ])(
    'navigates to %s section and renders expected title',
    async (sidebarLabel, expectedTitle) => {
      render(<Home />);
      await userEvent.click(screen.getByText(sidebarLabel));
      expect(screen.getByText(expectedTitle)).toBeDefined();
    },
  );
});

// ---------------------------------------------------------------------------
// Error state tests — ChartCard displays error UI when hook fails
// ---------------------------------------------------------------------------

describe('Home page — error state', () => {
  it('shows "Failed to load data" in every key-indicators chart when hook errors', () => {
    state.keyIndicators.error = new Error('API unavailable');
    render(<Home />);
    // key-indicators renders 4 charts (CPI, Unemployment, GDP, S&P 500)
    const errors = screen.getAllByText('Failed to load data');
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });

  it('shows "Please refresh the page to try again" alongside the error', () => {
    state.keyIndicators.error = new Error('API unavailable');
    render(<Home />);
    expect(
      screen.getAllByText('Please refresh the page to try again')[0],
    ).toBeDefined();
  });

  it('shows error in inflation section when inflation hook errors', async () => {
    state.inflation.error = new Error('Inflation API failed');
    render(<Home />);
    await userEvent.click(screen.getByText('Inflation'));
    expect(screen.getAllByText('Failed to load data').length).toBeGreaterThanOrEqual(1);
  });

  it('does not show error in key-indicators when only inflation hook errors', async () => {
    state.inflation.error = new Error('Inflation API failed');
    render(<Home />);
    // Default section is key-indicators — should have no error messages
    expect(screen.queryByText('Failed to load data')).toBeNull();
  });
});
