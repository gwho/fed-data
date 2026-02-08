/**
 * Shared TypeScript interfaces for custom hooks
 *
 * This file centralizes all type definitions used across the 8 domain hooks.
 * Using shared types ensures consistency and makes refactoring easier.
 *
 * **Pattern: Generic DomainHookResult<T>**
 *
 * All domain hooks return the same shape:
 * - `data: T` — the specific data for that domain (varies by hook)
 * - `loading: boolean` — true while API calls are in flight, false otherwise
 * - `error: Error | null` — populated if any API call fails, null on success
 *
 * The generic `<T>` parameter lets us reuse this pattern across all hooks:
 * - `DomainHookResult<InflationData>` → data is InflationData
 * - `DomainHookResult<EmploymentData>` → data is EmploymentData
 * - ...and so on for all 8 domains
 *
 * **Why Generics?**
 *
 * Without generics, we'd need 8 separate interfaces with nearly identical shapes:
 * ```typescript
 * interface InflationHookResult { data: InflationData; loading: boolean; error: Error | null; }
 * interface EmploymentHookResult { data: EmploymentData; loading: boolean; error: Error | null; }
 * // ...6 more copy-pasted interfaces...
 * ```
 *
 * With generics, we define the pattern once and parameterize it. This keeps the codebase DRY
 * (Don't Repeat Yourself) and makes changes to the hook return shape easy — modify one interface,
 * not eight.
 *
 * **ChartData vs MergedDataPoint**
 *
 * - `ChartData[]` - Used for single-series charts (e.g., one line on a chart)
 *   - Structure: `{ date: string; value: number }[]`
 *   - Example: `inflation.data.coreCpi` is an array of date-value pairs
 *
 * - `MergedDataPoint[]` - Used for multi-series charts (e.g., three lines on one chart)
 *   - Structure: `{ date: string; [key: string]: number }[]`
 *   - Example: `consumerSpending.data.pceChart` has `{ date, total, durables, services }`
 *   - Created by `mergeSeriesByDate` helper to align multiple series by date
 *
 * @see useInflationData - Example of DomainHookResult<InflationData>
 * @see useConsumerSpendingData - Example of MergedDataPoint[] usage
 */

import { ChartData, MergedDataPoint } from '@/app/utils/chartHelpers';

// Re-export common types for convenience
export type { ChartData, MergedDataPoint };

/**
 * Generic result type for all domain hooks
 *
 * Provides a consistent return shape across all 8 domain hooks: data, loading state, and error state.
 *
 * @template T - The specific data type for this domain (e.g., InflationData, EmploymentData)
 *
 * @example
 * ```typescript
 * // In a hook implementation:
 * export function useInflationData(isActive: boolean): DomainHookResult<InflationData> {
 *   // ...
 *   return { data, loading, error };
 * }
 *
 * // In a component:
 * const inflation = useInflationData(true);
 * inflation.data.coreCpi  // TypeScript knows this exists and is ChartData[]
 * inflation.loading       // boolean
 * inflation.error         // Error | null
 * ```
 */
export interface DomainHookResult<T> {
  /** The fetched and formatted data for this domain */
  data: T;
  /** True while API calls are in progress, false after completion (success or error) */
  loading: boolean;
  /** Error object if any API call failed, null if all successful */
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
