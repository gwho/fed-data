/**
 * Chart Helper Utilities
 * 
 * This module provides reusable helpers for safely merging FRED data series
 * and formatting values for display in charts.
 */

export interface ChartData {
  date: string;
  value: number;
}

export interface SeriesConfig {
  key: string;
  data: ChartData[];
  transform?: (value: number) => number;
}

export interface MergedDataPoint {
  date: string;
  [key: string]: string | number | null;
}

/**
 * Merges multiple FRED series by date, handling missing data safely.
 * 
 * WHY THIS MATTERS:
 * Index-based merging (map((d, i) => ...)) is DANGEROUS because:
 * 1. Different series may have different date ranges
 * 2. Missing data points create misalignment
 * 3. Leads to plotting wrong values on wrong dates
 * 4. No warning when data is corrupted
 * 
 * Example of the problem:
 * Series A: [Jan: 100, Feb: 110, Mar: 120]
 * Series B: [Jan: 50, Mar: 70]  // Missing Feb!
 * 
 * Index merge gives: [{Jan: A=100, B=50}, {Feb: A=110, B=70}]  // WRONG! B's March shown in Feb
 * Date merge gives:  [{Jan: A=100, B=50}, {Feb: A=110, B=null}, {Mar: A=120, B=70}]  // CORRECT
 * 
 * @param seriesConfigs - Array of series with keys and optional transforms
 * @returns Array of merged data points sorted by date, with null for missing values
 */
export function mergeSeriesByDate(seriesConfigs: SeriesConfig[]): MergedDataPoint[] {
  // Collect all unique dates across all series
  const dateSet = new Set<string>();
  seriesConfigs.forEach(config => {
    config.data.forEach(point => dateSet.add(point.date));
  });

  // Sort dates chronologically
  const sortedDates = Array.from(dateSet).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getTime() - dateB.getTime();
  });

  // Create a map for each series: date -> value
  const seriesMaps = seriesConfigs.map(config => {
    const map = new Map<string, number>();
    config.data.forEach(point => {
      const value = config.transform ? config.transform(point.value) : point.value;
      map.set(point.date, value);
    });
    return { key: config.key, map };
  });

  // Build merged data points
  return sortedDates.map(date => {
    const point: MergedDataPoint = { date };
    
    seriesMaps.forEach(({ key, map }) => {
      // Use null (not 0) for missing data so charts don't imply fake values
      point[key] = map.get(date) ?? null;
    });

    return point;
  });
}

/**
 * Format value in trillions with one decimal place
 * @example formatTrillions(18234.5) => "$18.2T"
 */
export function formatTrillions(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return `$${(value / 1000).toFixed(1)}T`;
}

/**
 * Format value in billions with one decimal place
 * @example formatBillions(93234) => "$93.2B"
 */
export function formatBillions(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return `$${(value / 1000).toFixed(1)}B`;
}

/**
 * Format value as percentage with one decimal place
 * @example formatPercent(4.5) => "4.5%"
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

/**
 * Format value as index with one decimal place
 * @example formatIndex(79.2) => "79.2"
 */
export function formatIndex(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return value.toFixed(1);
}

/**
 * Format date string for axis ticks
 * Converts various date formats to readable month labels
 * @example formatDateTick("Jan") => "Jan"
 * @example formatDateTick("2024-01-01") => "Jan 2024"
 */
export function formatDateTick(date: string): string {
  // Already formatted (e.g., "Jan")
  if (date.length <= 3) return date;
  
  // ISO date format
  if (date.includes('-')) {
    const d = new Date(date);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${month} ${year}`;
  }
  
  return date;
}

/**
 * Format date for tooltip display
 * @example formatTooltipDate("2024-01-01") => "January 2024"
 */
export function formatTooltipDate(date: string): string {
  if (date.includes('-')) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return date;
}
