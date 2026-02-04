/**
 * Shared TypeScript types for custom hooks
 */

import { ChartData, MergedDataPoint } from '@/app/utils/chartHelpers';

// Re-export common types
export type { ChartData, MergedDataPoint };

/**
 * Generic result type for domain hooks
 */
export interface DomainHookResult<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

/**
 * Inflation domain data
 */
export interface InflationData {
  coreCpi: ChartData[];
  pce: ChartData[];
  corePce: ChartData[];
  foodCpi: ChartData[];
  energyCpi: ChartData[];
  housingCpi: ChartData[];
  medicalCpi: ChartData[];
}

/**
 * Employment domain data
 */
export interface EmploymentData {
  laborForce: ChartData[];
  payrolls: ChartData[];
  initialClaims: ChartData[];
  hourlyEarnings: ChartData[];
}

/**
 * Economic Growth domain data
 */
export interface EconomicGrowthData {
  realGdp: ChartData[];
  nominalGdp: ChartData[];
  industrialProd: ChartData[];
  retailSales: ChartData[];
  capacityUtil: ChartData[];
}

/**
 * Housing domain data
 */
export interface HousingData {
  homePrice: ChartData[];
  housingStarts: ChartData[];
  buildingPermits: ChartData[];
  mortgageRate: ChartData[];
  affordability: ChartData[];
  newHomeSales: ChartData[];
  existingHomeSales: ChartData[];
}

/**
 * Exchange Rates domain data
 */
export interface ExchangeRatesData {
  dollarIndex: ChartData[];
  eur: ChartData[];
  gbp: ChartData[];
  jpy: ChartData[];
  cny: ChartData[];
  mxn: ChartData[];
  inr: ChartData[];
  cad: ChartData[];
  aud: ChartData[];
}

/**
 * Consumer Spending domain data (merged charts)
 */
export interface ConsumerSpendingData {
  pceChart: MergedDataPoint[];
  retailChart: MergedDataPoint[];
  savingsChart: MergedDataPoint[];
  sentimentChart: MergedDataPoint[];
}

/**
 * Market Indices domain data (merged charts)
 */
export interface MarketIndicesData {
  equityIndices: MergedDataPoint[];
  vix: ChartData[];
  creditSpread: MergedDataPoint[];
  breadth: MergedDataPoint[];
}

/**
 * Key Indicators domain data (loaded on mount)
 */
export interface KeyIndicatorsData {
  cpi: ChartData[];
  unemployment: ChartData[];
  tenYear: ChartData[];
  threeMonth: ChartData[];
  fedFunds: ChartData[];
  mortgage: ChartData[];
  gdp: ChartData[];
  sp500: ChartData[];
}
