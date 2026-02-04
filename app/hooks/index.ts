/**
 * Barrel export for all custom hooks
 *
 * This file provides a single import point for all domain-specific hooks,
 * making it easier to import them in components.
 *
 * @example
 * ```tsx
 * import { useInflationData, useEmploymentData } from '@/app/hooks';
 * ```
 */

// Shared utilities
export { useDateRange } from './shared/useDateRange';
export { useDataFormatter } from './shared/useDataFormatter';

// Types
export type {
  ChartData,
  MergedDataPoint,
  DomainHookResult,
  InflationData,
  EmploymentData,
  EconomicGrowthData,
  HousingData,
  ExchangeRatesData,
  ConsumerSpendingData,
  MarketIndicesData,
  KeyIndicatorsData,
} from './shared/types';

// Domain hooks
export { useInflationData } from './domain/useInflationData';
export { useEmploymentData } from './domain/useEmploymentData';
export { useEconomicGrowthData } from './domain/useEconomicGrowthData';
export { useHousingData } from './domain/useHousingData';
export { useExchangeRatesData } from './domain/useExchangeRatesData';
export { useConsumerSpendingData } from './domain/useConsumerSpendingData';
export { useMarketIndicesData } from './domain/useMarketIndicesData';
export { useKeyIndicatorsData } from './domain/useKeyIndicatorsData';
