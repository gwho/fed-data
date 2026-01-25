/**
 * Data Frequency Normalization Utilities
 *
 * This module handles the alignment of time-series data with different frequencies.
 * FRED data comes at various intervals (daily, monthly, quarterly), and these utilities
 * help merge them into a common timeline for analysis and signal calculation.
 *
 * @see docs/DATA_NORMALIZATION.md for comprehensive documentation
 *
 * @example
 * // Merge daily VIX with monthly unemployment
 * const merged = mergeMultipleSeries(
 *   [
 *     { key: 'vix', data: vixData },
 *     { key: 'unemployment', data: unemploymentData },
 *   ],
 *   { fillMethod: 'forward' }
 * );
 */

import { FredSeriesData } from './fredApi';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Detected frequency of a time series
 *
 * FRED series come in different frequencies:
 * - daily: VIXCLS, FEDFUNDS, Treasury yields
 * - monthly: CPIAUCSL, UNRATE, housing data
 * - quarterly: GDP growth rates
 */
export type DataFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'unknown';

/**
 * Methods for filling missing values when normalizing data
 *
 * - forward: Last Observation Carried Forward (LOCF) - best for economic indicators
 * - linear: Linear interpolation - best for continuously-changing data like prices
 * - none: Leave gaps as null - when you need to know where data is missing
 */
export type FillMethod = 'forward' | 'linear' | 'none';

/**
 * Configuration for merging multiple series
 */
export interface MergeConfig {
  /** How to fill missing values when aligning series */
  fillMethod: FillMethod;
  /** If true, only include dates where ALL series have data (intersection) */
  innerJoin?: boolean;
}

/**
 * A single data point in merged series output
 */
export interface MergedDataPoint {
  date: string;
  [seriesKey: string]: string | number | null;
}

/**
 * Metadata about a series after merging
 */
export interface SeriesInfo {
  key: string;
  originalFrequency: DataFrequency;
  originalCount: number;
  filledCount: number;
}

/**
 * Result of merging multiple series
 */
export interface MergedSeriesResult {
  data: MergedDataPoint[];
  seriesInfo: SeriesInfo[];
  dateRange: { start: string; end: string };
}

// =============================================================================
// Helper Functions (Internal)
// =============================================================================

/**
 * Parse a date string to a Date object, using noon UTC to avoid timezone issues
 *
 * WHY NOON UTC?
 * When you parse "2024-01-15" without a time, JavaScript interprets it as midnight UTC.
 * But if you're in a negative timezone (like US Eastern), midnight UTC is actually
 * the previous day in local time, causing off-by-one errors.
 *
 * Using noon UTC ensures the date is correct in all timezones from UTC-12 to UTC+14.
 *
 * @internal
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00Z');
}

/**
 * Format a Date object to 'YYYY-MM-DD' string
 * @internal
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate the number of days between two date strings
 * @internal
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Binary search to find the index of the largest date <= target
 * Returns -1 if target is before all dates
 * @internal
 */
function findFloorDateIndex(sortedDates: string[], target: string): number {
  let left = 0;
  let right = sortedDates.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (sortedDates[mid] <= target) {
      result = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Generate an array of daily date strings between start and end (inclusive)
 *
 * Uses native JavaScript Date for zero external dependencies.
 *
 * @param start - Start date in 'YYYY-MM-DD' format
 * @param end - End date in 'YYYY-MM-DD' format
 * @returns Array of date strings from start to end (inclusive)
 *
 * @example
 * generateDateRange('2024-01-01', '2024-01-05')
 * // Returns: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']
 *
 * @throws {Error} If start date is after end date
 */
export function generateDateRange(start: string, end: string): string[] {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (startDate > endDate) {
    throw new Error(
      `Start date (${start}) must be before or equal to end date (${end})`
    );
  }

  const dates: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(formatDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Detect the frequency of a time series from its date patterns
 *
 * Analyzes gaps between consecutive data points to determine the most
 * likely frequency. Uses median gap to be robust against outliers
 * (like holidays creating larger gaps in daily data).
 *
 * @param data - Array of FredSeriesData (will be sorted internally)
 * @returns Detected frequency or 'unknown' if pattern is irregular
 *
 * @example
 * // Monthly unemployment data
 * detectFrequency([
 *   { date: '2024-01-01', value: '3.7' },
 *   { date: '2024-02-01', value: '3.9' },
 *   { date: '2024-03-01', value: '3.8' },
 * ])
 * // Returns: 'monthly'
 */
export function detectFrequency(data: FredSeriesData[]): DataFrequency {
  if (data.length < 2) {
    return 'unknown';
  }

  // Sort by date
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  // Calculate gaps in days between consecutive observations
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
  }

  // Use median gap (robust to outliers like holiday gaps)
  gaps.sort((a, b) => a - b);
  const medianGap = gaps[Math.floor(gaps.length / 2)];

  // Classify by typical gaps
  // Daily: 1-5 days (accounts for weekends in market data)
  // Weekly: 6-10 days
  // Monthly: 28-35 days
  // Quarterly: 85-95 days
  // Yearly: 360-380 days
  if (medianGap <= 5) return 'daily';
  if (medianGap <= 10) return 'weekly';
  if (medianGap <= 35) return 'monthly';
  if (medianGap <= 95) return 'quarterly';
  if (medianGap <= 380) return 'yearly';
  return 'unknown';
}

/**
 * Fill gaps in time series using forward-fill (Last Observation Carried Forward)
 *
 * For each target date, uses the most recent available value from the source data.
 * This is THE standard method for economic data where values are "sticky" -
 * they represent a measured state that persists until the next measurement.
 *
 * WHY FORWARD-FILL FOR ECONOMIC DATA?
 * When the Bureau of Labor Statistics reports unemployment at 3.7% on January 5th,
 * that value remains the official rate until the next release. It doesn't magically
 * change on January 15th - we just don't have new information yet.
 *
 * @param data - Source data (will be sorted internally)
 * @param targetDates - Array of dates to fill values for
 * @returns Array of FredSeriesData with values for each target date
 *
 * @example
 * const monthlyData = [
 *   { date: '2024-01-01', value: '3.7' },
 *   { date: '2024-02-01', value: '3.9' },
 * ];
 * const dailyDates = ['2024-01-15', '2024-01-20', '2024-01-25'];
 *
 * forwardFill(monthlyData, dailyDates)
 * // Returns: [
 * //   { date: '2024-01-15', value: '3.7' },  // Uses Jan 1 value
 * //   { date: '2024-01-20', value: '3.7' },  // Uses Jan 1 value
 * //   { date: '2024-01-25', value: '3.7' },  // Uses Jan 1 value
 * // ]
 */
export function forwardFill(
  data: FredSeriesData[],
  targetDates: string[]
): FredSeriesData[] {
  // Handle empty source
  if (data.length === 0) {
    return targetDates.map((date) => ({ date, value: '' }));
  }

  // Sort source data by date
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  // Extract dates and values for efficient lookup
  const sourceDates = sorted.map((d) => d.date);
  const sourceValues = sorted.map((d) => d.value);

  return targetDates.map((targetDate) => {
    // Binary search for largest source date <= target date
    const floorIndex = findFloorDateIndex(sourceDates, targetDate);

    return {
      date: targetDate,
      value: floorIndex >= 0 ? sourceValues[floorIndex] : '',
    };
  });
}

/**
 * Fill gaps using linear interpolation between known data points
 *
 * Calculates intermediate values by linearly interpolating between the two
 * nearest known data points (one before, one after). Useful for data that
 * changes smoothly over time, like stock prices or exchange rates.
 *
 * CAUTION: Do NOT use for economic releases like GDP or CPI!
 * Linear interpolation implies the value changed gradually between releases,
 * which is false. GDP is measured once per quarter; it doesn't change daily.
 *
 * @param data - Source data (will be sorted internally)
 * @param targetDates - Array of dates to interpolate values for
 * @returns Array of FredSeriesData with interpolated values
 *
 * @example
 * const data = [
 *   { date: '2024-01-01', value: '100' },
 *   { date: '2024-01-10', value: '110' },
 * ];
 * const targets = ['2024-01-01', '2024-01-05', '2024-01-10'];
 *
 * interpolateLinear(data, targets)
 * // Returns: [
 * //   { date: '2024-01-01', value: '100' },
 * //   { date: '2024-01-05', value: '105.56' },  // Interpolated
 * //   { date: '2024-01-10', value: '110' },
 * // ]
 */
export function interpolateLinear(
  data: FredSeriesData[],
  targetDates: string[]
): FredSeriesData[] {
  // Handle empty or single-point source
  if (data.length === 0) {
    return targetDates.map((date) => ({ date, value: '' }));
  }

  if (data.length === 1) {
    // Can't interpolate with single point - only exact match works
    const sourceDate = data[0].date;
    return targetDates.map((date) => ({
      date,
      value: date === sourceDate ? data[0].value : '',
    }));
  }

  // Sort source data by date
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const sourceDates = sorted.map((d) => d.date);
  const sourceValues = sorted.map((d) => parseFloat(d.value));

  return targetDates.map((targetDate) => {
    // Check for exact match first
    const exactIndex = sourceDates.indexOf(targetDate);
    if (exactIndex !== -1) {
      return { date: targetDate, value: sorted[exactIndex].value };
    }

    // Find surrounding points
    const floorIndex = findFloorDateIndex(sourceDates, targetDate);

    // Before all data - can't interpolate
    if (floorIndex === -1) {
      return { date: targetDate, value: '' };
    }

    // After all data - can't interpolate
    if (floorIndex === sourceDates.length - 1) {
      return { date: targetDate, value: '' };
    }

    // Interpolate between floor and ceiling points
    const d1 = sourceDates[floorIndex];
    const d2 = sourceDates[floorIndex + 1];
    const v1 = sourceValues[floorIndex];
    const v2 = sourceValues[floorIndex + 1];

    // Handle NaN values
    if (isNaN(v1) || isNaN(v2)) {
      return { date: targetDate, value: '' };
    }

    // Linear interpolation
    const totalDays = daysBetween(d1, d2);
    const daysFromD1 = daysBetween(d1, targetDate);
    const ratio = daysFromD1 / totalDays;
    const interpolatedValue = v1 + (v2 - v1) * ratio;

    return {
      date: targetDate,
      value: interpolatedValue.toFixed(2),
    };
  });
}

/**
 * Merge multiple time series to a common date range with aligned values
 *
 * This is the core function for combining FRED series of different frequencies.
 * Creates a unified dataset where all series have values for the same dates.
 *
 * @param series - Array of objects containing key and data for each series
 * @param config - Configuration for how to handle merging
 * @returns Merged result with aligned data and metadata
 *
 * @example
 * const dailyVix = [
 *   { date: '2024-01-01', value: '14.8' },
 *   { date: '2024-01-02', value: '15.1' },
 *   { date: '2024-01-03', value: '14.9' },
 * ];
 * const monthlyUnemployment = [
 *   { date: '2024-01-01', value: '3.7' },
 * ];
 *
 * mergeMultipleSeries(
 *   [
 *     { key: 'vix', data: dailyVix },
 *     { key: 'unemployment', data: monthlyUnemployment },
 *   ],
 *   { fillMethod: 'forward' }
 * )
 * // Returns: {
 * //   data: [
 * //     { date: '2024-01-01', vix: '14.8', unemployment: '3.7' },
 * //     { date: '2024-01-02', vix: '15.1', unemployment: '3.7' },
 * //     { date: '2024-01-03', vix: '14.9', unemployment: '3.7' },
 * //   ],
 * //   seriesInfo: [...],
 * //   dateRange: { start: '2024-01-01', end: '2024-01-03' }
 * // }
 */
export function mergeMultipleSeries(
  series: Array<{ key: string; data: FredSeriesData[] }>,
  config: MergeConfig
): MergedSeriesResult {
  // Handle empty input
  if (series.length === 0 || series.every((s) => s.data.length === 0)) {
    return {
      data: [],
      seriesInfo: [],
      dateRange: { start: '', end: '' },
    };
  }

  // Collect all unique dates across all series (union)
  const allDatesSet = new Set<string>();
  for (const { data } of series) {
    for (const point of data) {
      allDatesSet.add(point.date);
    }
  }

  // Sort dates chronologically
  let allDates = Array.from(allDatesSet).sort();

  // If innerJoin, filter to dates present in ALL series
  if (config.innerJoin) {
    const dateInAllSeries = (date: string) =>
      series.every((s) => s.data.some((d) => d.date === date));
    allDates = allDates.filter(dateInAllSeries);
  }

  if (allDates.length === 0) {
    return {
      data: [],
      seriesInfo: series.map((s) => ({
        key: s.key,
        originalFrequency: detectFrequency(s.data),
        originalCount: s.data.length,
        filledCount: 0,
      })),
      dateRange: { start: '', end: '' },
    };
  }

  // Align each series to the common dates
  const alignedSeries: Record<string, FredSeriesData[]> = {};
  const seriesInfo: SeriesInfo[] = [];

  for (const { key, data } of series) {
    let aligned: FredSeriesData[];

    switch (config.fillMethod) {
      case 'forward':
        aligned = forwardFill(data, allDates);
        break;
      case 'linear':
        aligned = interpolateLinear(data, allDates);
        break;
      case 'none':
      default:
        // Only exact matches
        const dataMap = new Map(data.map((d) => [d.date, d.value]));
        aligned = allDates.map((date) => ({
          date,
          value: dataMap.get(date) || '',
        }));
        break;
    }

    alignedSeries[key] = aligned;

    // Calculate how many values were filled vs original
    const originalDates = new Set(data.map((d) => d.date));
    const filledCount = aligned.filter(
      (d) => d.value !== '' && !originalDates.has(d.date)
    ).length;

    seriesInfo.push({
      key,
      originalFrequency: detectFrequency(data),
      originalCount: data.length,
      filledCount,
    });
  }

  // Build merged data points
  const mergedData: MergedDataPoint[] = allDates.map((date, i) => {
    const point: MergedDataPoint = { date };
    for (const { key } of series) {
      const value = alignedSeries[key][i].value;
      point[key] = value === '' ? null : value;
    }
    return point;
  });

  return {
    data: mergedData,
    seriesInfo,
    dateRange: {
      start: allDates[0],
      end: allDates[allDates.length - 1],
    },
  };
}

/**
 * Convenience function to get the latest value from aligned series
 *
 * @param data - Array of FredSeriesData
 * @returns The most recent non-empty value, or null if none exists
 */
export function getLatestAlignedValue(
  data: FredSeriesData[]
): FredSeriesData | null {
  if (data.length === 0) return null;

  // Sort by date descending
  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));

  // Find first non-empty value
  for (const point of sorted) {
    if (point.value !== '') {
      return point;
    }
  }

  return null;
}
