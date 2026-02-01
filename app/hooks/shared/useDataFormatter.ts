import { useCallback } from 'react';
import { ChartData } from './types';
import { FredSeriesData } from '@/app/lib/fredApi';

/**
 * Custom hook providing data formatting utilities for FRED series.
 *
 * Memoizes formatting functions to prevent recreation on every render,
 * which is important for useEffect dependency arrays.
 *
 * @returns Object containing formatting functions for different chart types
 *
 * @example
 * ```tsx
 * const { formatMonthly, formatIsoDate } = useDataFormatter();
 *
 * const coreCpi = formatMonthly(rawData);  // ["Jan", "Feb", "Mar"]
 * const pceData = formatIsoDate(rawData);  // ["2024-01-01", "2024-02-01"]
 * ```
 */
export function useDataFormatter() {
  /**
   * Format data with short month name (e.g., "Jan", "Feb")
   * Used for most monthly series where year is not needed
   */
  const formatMonthly = useCallback((data: FredSeriesData[]): ChartData[] =>
    data.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
      value: parseFloat(d.value),
    })), []);

  /**
   * Format data with month and year (e.g., "Jan '24", "Feb '24")
   * Used for quarterly series where year context is important
   */
  const formatQuarterly = useCallback((data: FredSeriesData[]): ChartData[] =>
    data.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      value: parseFloat(d.value),
    })), []);

  /**
   * Keep ISO date format (e.g., "2024-01-01")
   * Used when merging series by date (mergeSeriesByDate requires ISO format)
   */
  const formatIsoDate = useCallback((data: FredSeriesData[]): ChartData[] =>
    data.map(d => ({
      date: d.date,
      value: parseFloat(d.value),
    })), []);

  return { formatMonthly, formatQuarterly, formatIsoDate };
}
